// archiveNavigation.test.tsx — playing an older Daily Puzzle from the day-strip.
//
// Slot-Fill sibling of the Guess-family guard (vrestifrasi/leksiarxeio): the
// leaderboard's "play this puzzle" link is a client-side navigation, so the
// board stays mounted and only its props change. A Session belongs to one
// Puzzle, so the round must not carry across dates. Slot-Fill games key their
// Session by date (`sessionKey: today`), so the render site keys by the same.

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PosokaneiPageClient } from "@/components/posokanei/PosokaneiPageClient";
import type { PosokaneiPuzzle } from "@/games/posokanei/types";

vi.mock("@/hooks/usePlayerIdentity", () => ({
  usePlayerIdentity: () => ({ deviceId: "", displayName: "", leaderboardProps: {} }),
}));
vi.mock("@/components/shared/GameLeaderboardModal", () => ({
  GameLeaderboardModal: () => null,
}));

const TODAY   = "2026-08-05";
const ARCHIVE = "2026-08-01";

function puzzleFor(date: string, item: string): PosokaneiPuzzle {
  return {
    date, item, itemType: "generic", unit: "τεμάχιο",
    price: 2.0, band: 0.1, photo: `/posokanei/${date}.svg`,
    photoSource: "Δείγμα", photoLicense: "Placeholder",
    sourceStore: "Δείγμα", sourceDate: date,
  };
}

/** A finished (gave-up) round for `date`, as the store holds it. */
function seedFinishedRound(date: string) {
  const existing = JSON.parse(localStorage.getItem("wordgames:state") ?? "{}");
  localStorage.setItem(
    "wordgames:state",
    JSON.stringify({
      ...existing,
      posokanei: { ...(existing.posokanei ?? {}), [date]: { guesses: [], gaveUp: true } },
    }),
  );
}

/** The price input disappears once the round is over. */
function roundIsFinished(): boolean {
  return screen.queryByRole("textbox") === null;
}

beforeEach(() => {
  localStorage.clear();
});

describe("Πόσο κάνει; — navigating between Daily Puzzles", () => {
  it("an unplayed archive date starts fresh after finishing today's round", () => {
    seedFinishedRound(TODAY);

    const { rerender } = render(
      <PosokaneiPageClient target={puzzleFor(TODAY, "Αγγούρι")} today={TODAY} />,
    );
    expect(roundIsFinished()).toBe(true);

    rerender(
      <PosokaneiPageClient target={puzzleFor(ARCHIVE, "Ντομάτα")} today={ARCHIVE} />,
    );

    expect(roundIsFinished()).toBe(false);
  });

  it("returning to an already-played date restores that date's Session", () => {
    seedFinishedRound(ARCHIVE);

    const { rerender } = render(
      <PosokaneiPageClient target={puzzleFor(TODAY, "Αγγούρι")} today={TODAY} />,
    );
    expect(roundIsFinished()).toBe(false);

    rerender(
      <PosokaneiPageClient target={puzzleFor(ARCHIVE, "Ντομάτα")} today={ARCHIVE} />,
    );

    expect(roundIsFinished()).toBe(true);
  });
});
