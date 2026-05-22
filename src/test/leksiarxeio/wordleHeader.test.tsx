// wordleHeader.test.tsx
// Tests for WordlePageClient: header layout, 🏆 leaderboard button presence,
// and scoring note in the rules modal.

import type { WordleLength, WordlePuzzle } from "@/games/leksiarxeio/types";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { WordlePageClient } from "@/components/leksiarxeio/WordleHeader";
import userEvent from "@testing-library/user-event";

// ── Minimal stubs ──────────────────────────────────────────────────────────────

vi.mock("@/components/leksiarxeio/WordleBoard", () => ({
  WordleBoard: ({ onOpenLeaderboardRef }: { onOpenLeaderboardRef?: (fn: () => void) => void }) => {
    // Immediately register a no-op so the ref is populated on mount
    onOpenLeaderboardRef?.(() => {});
    return <div data-testid="wordle-board" />;
  },
}));

const PUZZLE: WordlePuzzle = {
  id:     "2026-05-21",
  date:   "2026-05-21",
  answer: "αβγδε",
  length: 5,
};

const PUZZLES: WordlePuzzle[] = [PUZZLE];
const WORD_LISTS: Record<WordleLength, string[]> = {
  3: [], 4: [], 5: ["αβγδε"], 6: [], 7: [], 8: [],
};

function renderHeader() {
  return render(
    <WordlePageClient puzzles={PUZZLES} wordLists={WORD_LISTS} today="2026-05-21" />
  );
}

// ── Header layout ─────────────────────────────────────────────────────────────

describe("WordlePageClient — header", () => {
  it("renders the page title", () => {
    renderHeader();
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Leksiarxeio");
  });

  it("renders the leaderboard 🏆 button", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /πίνακας σκορ/i })).toBeDefined();
  });

  it("renders the HowToPlay ? trigger", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /how to play/i })).toBeDefined();
  });

  it("leaderboard button and help button appear in the same header row", () => {
    const { container } = renderHeader();
    const lbBtn   = screen.getByRole("button", { name: /πίνακας σκορ/i });
    const helpBtn = screen.getByRole("button", { name: /how to play/i });
    // Both are descendants of the header row (first child of the fragment)
    const headerRow = container.firstElementChild as HTMLElement;
    expect(headerRow.contains(lbBtn)).toBe(true);
    expect(headerRow.contains(helpBtn)).toBe(true);
  });
});

// ── Scoring note in rules ──────────────────────────────────────────────────────

describe("WordlePageClient — rules scoring note", () => {
  it("opens the HowToPlay modal and shows a scoring note", async () => {
    renderHeader();
    const helpBtn = screen.getByRole("button", { name: /how to play/i });
    await userEvent.click(helpBtn);
    // The scoring note contains the word "Σκορ"
    const scoreNote = screen.getByText(/σκορ/i);
    expect(scoreNote).toBeDefined();
  });
});
