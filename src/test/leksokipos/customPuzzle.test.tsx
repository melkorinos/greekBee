// Tests for buildCustomPuzzle and the ShareButton component.
// buildCustomPuzzle is the data-layer function that turns an arbitrary 7-letter
// combo into a fully playable Puzzle object at request time.

import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { buildCustomPuzzle } from "@/data/leksokipos/index";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";

// ── buildCustomPuzzle ──────────────────────────────────────────────────────────

describe("buildCustomPuzzle", () => {
  // The first call pays the dynamic import() of the 19.5 MB words-el.json
  // (that's the point of the lazy load — see the Fluid CPU guard in
  // deploymentReadiness.test.ts). Warm it once here so the individual tests
  // below keep the default 5 s timeout.
  beforeAll(async () => {
    await buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
  }, 60_000);

  it("returns a Puzzle with the expected shape", async () => {
    const puzzle = await buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(puzzle).toMatchObject<Partial<LeksokiposPuzzle>>({
      language: "el",
      centerLetter: "α",
      outerLetters: ["λ", "τ", "ι", "δ", "ε", "σ"],
    });
    expect(Array.isArray(puzzle.validWords)).toBe(true);
    expect(typeof puzzle.id).toBe("string");
    expect(typeof puzzle.date).toBe("string");
  });

  it("normalises an accented center letter", async () => {
    const puzzle = await buildCustomPuzzle("ά", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(puzzle.centerLetter).toBe("α");
  });

  it("normalises accented outer letters", async () => {
    const puzzle = await buildCustomPuzzle("α", ["λ", "τ", "ί", "δ", "έ", "σ"]);
    expect(puzzle.outerLetters).toEqual(["λ", "τ", "ι", "δ", "ε", "σ"]);
  });

  it("produces a stable ID regardless of outer-letter order", async () => {
    const a = await buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    const b = await buildCustomPuzzle("α", ["σ", "ε", "δ", "ι", "τ", "λ"]);
    expect(a.id).toBe(b.id);
  });

  it("produces different IDs for different letter combinations", async () => {
    const a = await buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    const b = await buildCustomPuzzle("β", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(a.id).not.toBe(b.id);
  });

  it("ID starts with 'custom-'", async () => {
    const puzzle = await buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(puzzle.id.startsWith("custom-")).toBe(true);
  });

  it("returns only validWords that contain the center letter", async () => {
    const puzzle = await buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    for (const word of puzzle.validWords) {
      expect(word).toContain("α");
    }
  });

  it("returns only validWords with at least 4 letters", async () => {
    const puzzle = await buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    for (const word of puzzle.validWords) {
      expect(word.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("returns only validWords whose letters are all in the allowed set", async () => {
    const center = "α";
    const outer = ["λ", "τ", "ι", "δ", "ε", "σ"];
    const allowed = new Set([center, ...outer]);
    const puzzle = await buildCustomPuzzle(center, outer);
    for (const word of puzzle.validWords) {
      for (const ch of word) {
        expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  it("returns a non-empty validWords array for a reasonable letter combo", async () => {
    // α + common Greek consonants — should yield at least a handful of words
    const puzzle = await buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(puzzle.validWords.length).toBeGreaterThan(0);
  });

  it("returns empty validWords for an impossible letter combo", async () => {
    // All rare letters that appear together in essentially no Greek words
    const puzzle = await buildCustomPuzzle("ψ", ["ξ", "ζ", "θ", "χ", "φ", "β"]);
    expect(puzzle.validWords.length).toBe(0);
  });

  it("leaves date empty — a custom puzzle is not date-bound", async () => {
    const puzzle = await buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(puzzle.date).toBe("");
  });

  it("does not read the clock, so a cached render can never go stale", async () => {
    // The [center]/[outer] route caches this output for a week (revalidate).
    // Anything derived from "now" here freezes into that HTML, which is exactly
    // how the leaderboard day-strip shipped a build-time snapshot. Building the
    // same combo on two different days must give byte-identical output.
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-07-16T12:00:00Z"));
      const a = await buildCustomPuzzle("κ", ["α", "ε", "ι", "ο", "σ", "τ"]);
      vi.setSystemTime(new Date("2027-01-01T12:00:00Z"));
      const b = await buildCustomPuzzle("κ", ["α", "ε", "ι", "ο", "σ", "τ"]);
      expect(a).toEqual(b);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── ShareButton ────────────────────────────────────────────────────────────────

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ShareButton } from "@/components/leksokipos/ShareButton";

describe("ShareButton", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    writeText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the share button", () => {
    render(<ShareButton canonicalPath="/leksokipos/α/βγδεζη" />);
    expect(screen.getByTestId("btn-share")).toBeInTheDocument();
    // Idle tooltip text is rendered in the DOM (via the hover tooltip div)
    expect(screen.getByText("Κοινοποίηση")).toBeInTheDocument();
  });

  it("copies the provided URL to the clipboard on click", async () => {
    // In jsdom window.location.origin is 'http://localhost', so the full URL
    // is origin + canonicalPath.
    const path = "/leksokipos/α/βγδεζη";
    render(<ShareButton canonicalPath={path} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("btn-share"));
    });
    const expectedUrl = `${window.location.origin}${path}`;
    expect(writeText).toHaveBeenCalledWith(expectedUrl);
  });

  it("shows a success tooltip after a successful copy", async () => {
    render(<ShareButton canonicalPath="/leksokipos/α/βγδεζη" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("btn-share"));
    });
    // The button's aria-label and tooltip div both update to the success message
    expect(screen.getByTestId("btn-share")).toHaveAttribute("aria-label", "Αντιγράφηκε!");
  });

  it("shows an error tooltip when clipboard write fails", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    render(<ShareButton canonicalPath="/leksokipos/α/βγδεζη" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("btn-share"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("btn-share")).toHaveAttribute("aria-label", "Σφάλμα");
    });
  });
});
