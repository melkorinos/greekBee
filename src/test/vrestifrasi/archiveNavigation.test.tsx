// archiveNavigation.test.tsx — playing an older Daily Puzzle from the day-strip.
//
// The leaderboard's "Παίξε αυτό το παζλ →" link is a client-side navigation:
// Next.js keeps the board mounted and swaps the `puzzle` prop. The round must
// follow the puzzle — a Session belongs to one Puzzle, so switching dates must
// never carry the previous date's guesses or status across.

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VresTinFrasiPageClient } from "@/components/vrestifrasi/VresTinFrasiPageClient";
import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";

vi.mock("@/hooks/usePlayerIdentity", () => ({
  usePlayerIdentity: () => ({
    deviceId:         "dev-1",
    displayName:      "Tester",
    leaderboardProps: { deviceId: "dev-1", displayName: "Tester" },
  }),
}));

vi.mock("@/hooks/useScoreSubmission", () => ({
  useScoreSubmission: () => ({ submit: vi.fn(), submitWithName: vi.fn() }),
}));

const TODAY   = "2026-08-05";
const ARCHIVE = "2026-08-01";

const TODAY_PHRASE   = "Κάθε ζωή έχει νόημα";
const ARCHIVE_PHRASE = "Κάθε κακό για καλό";

function puzzleFor(date: string, phrase: string): VresTinFrasiPuzzle {
  const words = phrase.toLowerCase().split(" ");
  return {
    id:              `${date}-vresi`,
    date,
    phrase,
    normalizedWords: words,
    wordLengths:     words.map((w) => w.length),
  };
}

/** A won Session for `date`, shaped as the store holds it. */
function seedWonSession(date: string, word: string) {
  const existing = JSON.parse(localStorage.getItem("wordgames:state") ?? "{}");
  localStorage.setItem(
    "wordgames:state",
    JSON.stringify({
      ...existing,
      vrestifrasi: {
        ...(existing.vrestifrasi ?? {}),
        [`${date}-vresi`]: {
          guesses: [{ words: [word], tiles: [Array(word.length).fill("correct")] }],
          status:  "won",
        },
      },
    }),
  );
}

const BOARD_PROPS = {
  validWords: ["καθε", "κακο", "για", "καλο", "ζωη", "εχει", "νοημα"],
};

/** The on-screen keyboard is locked out whenever the round is over. */
function keyboardIsLocked(): boolean {
  return screen.getByTestId("btn-enter").className.includes("pointer-events-none");
}

beforeEach(() => {
  localStorage.clear();
});

describe("Vres Tin Frasi — navigating between Daily Puzzles", () => {
  it("an unplayed archive date starts fresh after finishing today's puzzle", () => {
    seedWonSession(TODAY, "καθε");

    const { rerender } = render(
      <VresTinFrasiPageClient puzzle={puzzleFor(TODAY, TODAY_PHRASE)} today={TODAY} {...BOARD_PROPS} />,
    );
    expect(keyboardIsLocked()).toBe(true);

    rerender(
      <VresTinFrasiPageClient puzzle={puzzleFor(ARCHIVE, ARCHIVE_PHRASE)} today={ARCHIVE} {...BOARD_PROPS} />,
    );

    expect(keyboardIsLocked()).toBe(false);
  });

  it("returning to an already-played date restores that date's Session", () => {
    seedWonSession(TODAY, "καθε");
    seedWonSession(ARCHIVE, "κακο");

    // Start on the archive date, then go back to today's finished round.
    const { rerender } = render(
      <VresTinFrasiPageClient puzzle={puzzleFor(ARCHIVE, ARCHIVE_PHRASE)} today={ARCHIVE} {...BOARD_PROPS} />,
    );
    expect(keyboardIsLocked()).toBe(true);

    rerender(
      <VresTinFrasiPageClient puzzle={puzzleFor(TODAY, TODAY_PHRASE)} today={TODAY} {...BOARD_PROPS} />,
    );

    // Today's round was also won — its Session must come back, not reset.
    expect(keyboardIsLocked()).toBe(true);
  });

  it("a played date's guesses survive leaving and coming back", () => {
    seedWonSession(ARCHIVE, "κακο");

    const { rerender } = render(
      <VresTinFrasiPageClient puzzle={puzzleFor(TODAY, TODAY_PHRASE)} today={TODAY} {...BOARD_PROPS} />,
    );
    // Today is unplayed — playable.
    expect(keyboardIsLocked()).toBe(false);

    rerender(
      <VresTinFrasiPageClient puzzle={puzzleFor(ARCHIVE, ARCHIVE_PHRASE)} today={ARCHIVE} {...BOARD_PROPS} />,
    );

    // The archive date was won earlier — restored, so locked.
    expect(keyboardIsLocked()).toBe(true);
    // And the winning word is on screen.
    expect(screen.getAllByText("Κ").length).toBeGreaterThan(0);
  });
});
