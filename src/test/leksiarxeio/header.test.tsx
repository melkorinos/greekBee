// header.test.tsx
// Tests for LeksiarxeioPageClient: header layout, 🏆 leaderboard button presence,
// and scoring note in the rules modal.

import type { LeksiarxeioLength, LeksiarxeioPuzzle } from "@/games/leksiarxeio/types";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { LeksiarxeioPageClient } from "@/components/leksiarxeio/LeksiarxeioHeader";
import userEvent from "@testing-library/user-event";

// ── Minimal stubs ──────────────────────────────────────────────────────────────

vi.mock("@/components/leksiarxeio/LeksiarxeioBoard", () => ({
  LeksiarxeioBoard: ({ onOpenLeaderboardRef }: { onOpenLeaderboardRef?: (fn: () => void) => void }) => {
    // Immediately register a no-op so the ref is populated on mount
    onOpenLeaderboardRef?.(() => {});
    return <div data-testid="leksiarxeio-board" />;
  },
}));

const PUZZLE: LeksiarxeioPuzzle = {
  id:     "2026-05-21",
  date:   "2026-05-21",
  answer: "αβγδε",
  length: 5,
};

const PUZZLES: LeksiarxeioPuzzle[] = [PUZZLE];
const WORD_LISTS: Record<LeksiarxeioLength, string[]> = {
  3: [], 4: [], 5: ["αβγδε"], 6: [], 7: [], 8: [],
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

describe("LeksiarxeioPageClient — rules scoring note", () => {
  it("opens the HowToPlay modal and shows a scoring note", async () => {
    renderHeader();
    const helpBtn = screen.getByRole("button", { name: /how to play/i });
    await userEvent.click(helpBtn);
    // The scoring note contains the word "Σκορ"
    const scoreNote = screen.getByText(/σκορ/i);
    expect(scoreNote).toBeDefined();
  });
});
