// Tests for buildCustomPuzzle and the ShareButton component.
// buildCustomPuzzle is the data-layer function that turns an arbitrary 7-letter
// combo into a fully playable Puzzle object at request time.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildCustomPuzzle } from "@/data/spelling-bee/index";
import type { SpellingBeePuzzle } from "@/games/leksokipos/types";

// ── buildCustomPuzzle ──────────────────────────────────────────────────────────

describe("buildCustomPuzzle", () => {
  it("returns a Puzzle with the expected shape", () => {
    const puzzle = buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(puzzle).toMatchObject<Partial<SpellingBeePuzzle>>({
      language: "el",
      centerLetter: "α",
      outerLetters: ["λ", "τ", "ι", "δ", "ε", "σ"],
    });
    expect(Array.isArray(puzzle.validWords)).toBe(true);
    expect(typeof puzzle.id).toBe("string");
    expect(typeof puzzle.date).toBe("string");
  });

  it("normalises an accented center letter", () => {
    const puzzle = buildCustomPuzzle("ά", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(puzzle.centerLetter).toBe("α");
  });

  it("normalises accented outer letters", () => {
    const puzzle = buildCustomPuzzle("α", ["λ", "τ", "ί", "δ", "έ", "σ"]);
    expect(puzzle.outerLetters).toEqual(["λ", "τ", "ι", "δ", "ε", "σ"]);
  });

  it("produces a stable ID regardless of outer-letter order", () => {
    const a = buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    const b = buildCustomPuzzle("α", ["σ", "ε", "δ", "ι", "τ", "λ"]);
    expect(a.id).toBe(b.id);
  });

  it("produces different IDs for different letter combinations", () => {
    const a = buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    const b = buildCustomPuzzle("β", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(a.id).not.toBe(b.id);
  });

  it("ID starts with 'custom-'", () => {
    const puzzle = buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(puzzle.id.startsWith("custom-")).toBe(true);
  });

  it("returns only validWords that contain the center letter", () => {
    const puzzle = buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    for (const word of puzzle.validWords) {
      expect(word).toContain("α");
    }
  });

  it("returns only validWords with at least 4 letters", () => {
    const puzzle = buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    for (const word of puzzle.validWords) {
      expect(word.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("returns only validWords whose letters are all in the allowed set", () => {
    const center = "α";
    const outer = ["λ", "τ", "ι", "δ", "ε", "σ"];
    const allowed = new Set([center, ...outer]);
    const puzzle = buildCustomPuzzle(center, outer);
    for (const word of puzzle.validWords) {
      for (const ch of word) {
        expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  it("returns a non-empty validWords array for a reasonable letter combo", () => {
    // α + common Greek consonants — should yield at least a handful of words
    const puzzle = buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(puzzle.validWords.length).toBeGreaterThan(0);
  });

  it("returns empty validWords for an impossible letter combo", () => {
    // All rare letters that appear together in essentially no Greek words
    const puzzle = buildCustomPuzzle("ψ", ["ξ", "ζ", "θ", "χ", "φ", "β"]);
    expect(puzzle.validWords.length).toBe(0);
  });

  it("sets date to today's ISO date", () => {
    const today = new Date().toISOString().split("T")[0];
    const puzzle = buildCustomPuzzle("α", ["λ", "τ", "ι", "δ", "ε", "σ"]);
    expect(puzzle.date).toBe(today);
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
    render(<ShareButton canonicalPath="/spelling-bee/α/βγδεζη" />);
    expect(screen.getByTestId("btn-share")).toBeInTheDocument();
    // Idle tooltip text is rendered in the DOM (via the hover tooltip div)
    expect(screen.getByText("Κοινοποίηση")).toBeInTheDocument();
  });

  it("copies the provided URL to the clipboard on click", async () => {
    // In jsdom window.location.origin is 'http://localhost', so the full URL
    // is origin + canonicalPath.
    const path = "/spelling-bee/α/βγδεζη";
    render(<ShareButton canonicalPath={path} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("btn-share"));
    });
    const expectedUrl = `${window.location.origin}${path}`;
    expect(writeText).toHaveBeenCalledWith(expectedUrl);
  });

  it("shows a success tooltip after a successful copy", async () => {
    render(<ShareButton canonicalPath="/spelling-bee/α/βγδεζη" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("btn-share"));
    });
    // The button's aria-label and tooltip div both update to the success message
    expect(screen.getByTestId("btn-share")).toHaveAttribute("aria-label", "Αντιγράφηκε!");
  });

  it("shows an error tooltip when clipboard write fails", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    render(<ShareButton canonicalPath="/spelling-bee/α/βγδεζη" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("btn-share"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("btn-share")).toHaveAttribute("aria-label", "Σφάλμα");
    });
  });
});
