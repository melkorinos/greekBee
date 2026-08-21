// archiveNavigation.test.tsx — playing an older Daily Puzzle from the day-strip.
//
// Leksiarxeio keeps one LengthPanel mounted per Length (4–8) and shows the
// active one. Those panels must follow the Puzzle, not just the Length: the
// leaderboard's "play this puzzle" link swaps every panel's puzzle prop in a
// client-side navigation, and a Session belongs to one Puzzle.

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LeksiarxeioBoard } from "@/components/leksiarxeio/LeksiarxeioBoard";
import type { LeksiarxeioLength, LeksiarxeioPuzzle } from "@/games/leksiarxeio/types";

vi.mock("@/hooks/usePlayerIdentity", () => ({
  usePlayerIdentity: () => ({
    deviceId:         "dev-1",
    displayName:      "Tester",
    leaderboardProps: { deviceId: "dev-1", displayName: "Tester" },
  }),
}));

const TODAY   = "2026-08-05";
const ARCHIVE = "2026-08-01";

const LENGTHS: LeksiarxeioLength[] = [4, 5, 6, 7, 8];

/** One puzzle per Length for `date`, answers varied so dates differ. */
function puzzlesFor(date: string, answers: Record<number, string>): LeksiarxeioPuzzle[] {
  return LENGTHS.map((length) => ({
    id:     `${date}-wordle-${length}`,
    date,
    answer: answers[length],
    length,
  }));
}

const TODAY_ANSWERS   = { 4: "καλο", 5: "καλοσ", 6: "καλοσυ", 7: "καλοσυν", 8: "καλοσυνη" };
const ARCHIVE_ANSWERS = { 4: "νερο", 5: "νεροσ", 6: "νεροσυ", 7: "νεροσυν", 8: "νεροσυνη" };

const WORD_LISTS = Object.fromEntries(
  LENGTHS.map((l) => [l, [TODAY_ANSWERS[l], ARCHIVE_ANSWERS[l]]]),
) as Record<LeksiarxeioLength, string[]>;

/** A won Session for one Length on `date`. */
function seedWonSession(date: string, length: LeksiarxeioLength, answer: string) {
  const existing = JSON.parse(localStorage.getItem("wordgames:state") ?? "{}");
  localStorage.setItem(
    "wordgames:state",
    JSON.stringify({
      ...existing,
      leksiarxeio: {
        ...(existing.leksiarxeio ?? {}),
        [`${date}-wordle-${length}`]: {
          guesses: [{ word: answer, tiles: Array(answer.length).fill("correct") }],
          status:  "won",
        },
      },
    }),
  );
}

const BOARD_PROPS = {
  wordLists:          WORD_LISTS,
  isLeaderboardOpen:  false,
  onOpenLeaderboard:  () => {},
  onCloseLeaderboard: () => {},
};

/** The active panel's keyboard is locked out once its round is over. */
function keyboardIsLocked(): boolean {
  return screen.getAllByTestId("btn-enter")[0].className.includes("pointer-events-none");
}

beforeEach(() => {
  localStorage.clear();
});

describe("Leksiarxeio — navigating between Daily Puzzles", () => {
  it("an unplayed archive date starts fresh after finishing today's length", () => {
    // Length 4 is the panel shown first, and it is already won today.
    seedWonSession(TODAY, 4, "καλο");

    const { rerender } = render(
      <LeksiarxeioBoard puzzles={puzzlesFor(TODAY, TODAY_ANSWERS)} today={TODAY} {...BOARD_PROPS} />,
    );
    expect(keyboardIsLocked()).toBe(true);

    rerender(
      <LeksiarxeioBoard puzzles={puzzlesFor(ARCHIVE, ARCHIVE_ANSWERS)} today={ARCHIVE} {...BOARD_PROPS} />,
    );

    expect(keyboardIsLocked()).toBe(false);
  });

  it("returning to an already-played date restores that date's Session", () => {
    seedWonSession(ARCHIVE, 4, "νερο");

    const { rerender } = render(
      <LeksiarxeioBoard puzzles={puzzlesFor(TODAY, TODAY_ANSWERS)} today={TODAY} {...BOARD_PROPS} />,
    );
    expect(keyboardIsLocked()).toBe(false);

    rerender(
      <LeksiarxeioBoard puzzles={puzzlesFor(ARCHIVE, ARCHIVE_ANSWERS)} today={ARCHIVE} {...BOARD_PROPS} />,
    );

    expect(keyboardIsLocked()).toBe(true);
  });
});
