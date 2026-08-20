// roundEnd.test.tsx — Λεξόκηπος's Round End: the one Game that POPS (ADR 0025).
//
// Λεξόκηπος has no terminal state — play continues past the top Rank — so its
// Round End is `isEndgame` (top Rank on a Daily Puzzle) and its Result Panel is a
// dismissible pop rather than an inline panel. Two consequences are tested here:
// the score it reports is LIVE (a re-share later shares the higher number), and
// the header ShareButton becomes the way back after dismissing the pop, while
// URL-sharing survives on Custom Puzzles, where sharing the board IS the point.

import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { LeksokiposPuzzle } from "@/games/leksokipos/types";

// GameBoard calls useDayChange → useRouter; provide a stub so it doesn't throw.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authLinked:       false,
    authUserName:     null,
    signInWithGoogle: vi.fn(async () => {}),
    signOut:          vi.fn(async () => {}),
    isLoading:        false,
  }),
}));

// ── GameBoard: reporting Round End upward ─────────────────────────────────────

import { GameBoard } from "@/components/leksokipos/GameBoard";

// Fixture mirrors GameBoard.test.tsx: raw total 33 → maxScore 29, top rank at 24.
const PUZZLE: LeksokiposPuzzle = {
  id:           "2026-05-20-el",
  language:     "el",
  date:         "2026-05-20",
  centerLetter: "a",
  outerLetters: ["p", "i", "n", "t", "e", "d"],
  validWords:   ["anti", "paid", "paint", "painted", "panted", "patina"],
};

const CUSTOM: LeksokiposPuzzle = { ...PUZZLE, id: "custom-a-deinpt", date: "" };

async function submitWords(user: ReturnType<typeof userEvent.setup>, words: string[]) {
  for (const w of words) await user.keyboard(`${w}{Enter}`);
}

describe("Leksokipos GameBoard — reporting Round End", () => {
  it("reports nothing until the top Rank is reached", async () => {
    const onResultChange = vi.fn();
    const user = userEvent.setup();
    render(<GameBoard puzzle={PUZZLE} onResultChange={onResultChange} />);

    await submitWords(user, ["paint"]); // 5 pts — nowhere near the top rank
    expect(onResultChange).not.toHaveBeenCalledWith(expect.objectContaining({ score: 5 }));
    expect(onResultChange.mock.calls.every(([r]) => r === null)).toBe(true);
  });

  it("reports the Rank, the date and a LIVE score once the top Rank is reached", async () => {
    const onResultChange = vi.fn();
    const user = userEvent.setup();
    render(<GameBoard puzzle={PUZZLE} onResultChange={onResultChange} />);

    await submitWords(user, ["painted", "panted", "paint"]); // 25 pts → top rank
    expect(onResultChange).toHaveBeenLastCalledWith({
      rank:  "Απολυτότητα",
      score: 25,
      date:  PUZZLE.date,
    });

    await submitWords(user, ["anti"]); // play continues — the shared score follows
    const latest = onResultChange.mock.calls.at(-1)![0];
    expect(latest.score).toBeGreaterThan(25);
  });

  it("never reports Round End on a Custom Puzzle", async () => {
    const onResultChange = vi.fn();
    const user = userEvent.setup();
    render(<GameBoard puzzle={CUSTOM} onResultChange={onResultChange} />);

    await submitWords(user, ["painted", "panted", "paint", "anti", "paid", "patina"]);
    expect(onResultChange.mock.calls.every(([r]) => r === null)).toBe(true);
  });
});

