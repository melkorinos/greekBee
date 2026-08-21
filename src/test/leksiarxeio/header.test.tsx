// header.test.tsx
// Tests for LeksiarxeioPageClient: header layout, and the two things ADR 0027
// removed — the 🏆 leaderboard trigger and the scoring note in the rules modal.
// Both are asserted ABSENT here, because this header is hand-wired rather than
// GamePageChrome's, so nothing derives them from the (now empty) capabilities.

import type { LeksiarxeioLength, LeksiarxeioPuzzle } from "@/games/leksiarxeio/types";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { LeksiarxeioPageClient } from "@/components/leksiarxeio/LeksiarxeioPageClient";
import userEvent from "@testing-library/user-event";

// ── Minimal stubs ──────────────────────────────────────────────────────────────

vi.mock("@/components/leksiarxeio/LeksiarxeioBoard", () => ({
  LeksiarxeioBoard: () => <div data-testid="leksiarxeio-board" />,
}));

const PUZZLE: LeksiarxeioPuzzle = {
  id:     "2026-05-21",
  date:   "2026-05-21",
  answer: "αβγδε",
  length: 5,
};

const PUZZLES: LeksiarxeioPuzzle[] = [PUZZLE];
// Keys track LEKSIARXEIO.LENGTHS (4–8). There is no 3-letter Leksiarxeio.
const WORD_LISTS: Record<LeksiarxeioLength, string[]> = {
  4: [], 5: ["αβγδε"], 6: [], 7: [], 8: [],
};

function renderHeader() {
  return render(
    <LeksiarxeioPageClient puzzles={PUZZLES} wordLists={WORD_LISTS} today="2026-05-21" />
  );
}

// ── Header layout ─────────────────────────────────────────────────────────────

describe("LeksiarxeioPageClient — header", () => {
  it("renders the page title", () => {
    renderHeader();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Leksiarxeio");
  });

  it("renders no leaderboard 🏆 button", () => {
    renderHeader();
    expect(screen.queryByRole("button", { name: /πίνακας σκορ/i })).toBeNull();
  });

  it("renders the HowToPlay ? trigger", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /πώς να παίξεις/i })).toBeDefined();
  });

  it("the help button is in the header row", () => {
    const { container } = renderHeader();
    const helpBtn = screen.getByRole("button", { name: /πώς να παίξεις/i });
    // The header row is the first child of the fragment.
    const headerRow = container.firstElementChild as HTMLElement;
    expect(headerRow.contains(helpBtn)).toBe(true);
  });
});

// ── Rules copy ────────────────────────────────────────────────────────────────

describe("LeksiarxeioPageClient — rules", () => {
  it("opens the HowToPlay modal with no scoring note in it", async () => {
    renderHeader();
    const helpBtn = screen.getByRole("button", { name: /πώς να παίξεις/i });
    await userEvent.click(helpBtn);
    // The modal is open — the rules themselves still render …
    expect(screen.getAllByText(/προσπάθειες/i).length).toBeGreaterThan(0);
    // … and nothing in it mentions a score or points any more (ADR 0027).
    expect(screen.queryByText(/σκορ/i)).toBeNull();
    expect(screen.queryByText(/πόντοι/i)).toBeNull();
  });
});
