// reconcile.test.ts — the guard that stops a saved round being restored onto a
// board it was not played on (src/games/leksokipos/lib/reconcile.ts).
//
// Why this seam exists: both restore paths key a stored round on the puzzle
// DATE. When a corpus edit re-points a date at a different garden — as the
// 2026-08-13 thin-puzzle prune did — the old round comes back over the new
// board unless something filters it. In production that showed up as words
// nobody could see in the word list and a score measured against a ceiling that
// no longer existed.

import { describe, expect, it } from "vitest";

import { buildSnapshotFromWords, reconcileSnapshot } from "@/games/leksokipos/lib/reconcile";
import type { LeksokiposPuzzle, LeksokiposRoundSnapshot } from "@/games/leksokipos/types";

/** Centre α, outers π ι ν τ ε δ. */
const PUZZLE: LeksokiposPuzzle = {
  id:           "2026-08-13-el",
  language:     "el",
  date:         "2026-08-13",
  centerLetter: "α",
  outerLetters: ["π", "ι", "ν", "τ", "ε", "δ"],
  validWords:   ["αντι", "παιδι", "παιδια"],
};

const REST = { startedAt: 1_700_000_000_000, givenUp: false };

function snapshot(over: Partial<LeksokiposRoundSnapshot>): LeksokiposRoundSnapshot {
  return { foundWords: [], score: 0, currentRank: "Ψαράκι", ...REST, ...over };
}

describe("buildSnapshotFromWords", () => {
  it("keeps only the words this puzzle accepts and scores what is left", () => {
    // "παιδι" (5) = 5, "αντι" (4) = 1 flat; "καλημερα" belongs to another board.
    const built = buildSnapshotFromWords(["παιδι", "καλημερα", "αντι"], PUZZLE, REST);

    expect(built.foundWords).toEqual(["παιδι", "αντι"]);
    expect(built.score).toBe(6);
  });

  it("normalises accents and final sigma before matching", () => {
    // A round saved as "παίδι" or with a final sigma is the same word — the
    // filter must not throw away a legitimately found word on spelling alone.
    const puzzle = { ...PUZZLE, validWords: ["παιδι", "τσαπα"] };

    expect(buildSnapshotFromWords(["παίδι", "τςαπα"], puzzle, REST).foundWords)
      .toEqual(["παιδι", "τσαπα"]);
  });

  it("carries startedAt and givenUp through untouched", () => {
    const built = buildSnapshotFromWords(["αντι"], PUZZLE, { startedAt: 42, givenUp: true });

    expect(built.startedAt).toBe(42);
    expect(built.givenUp).toBe(true);
  });
});

describe("reconcileSnapshot", () => {
  it("returns the saved round untouched when every word belongs to the puzzle", () => {
    const saved = snapshot({ foundWords: ["παιδι", "αντι"], score: 6, currentRank: "Οκέι" });

    // Same object back: a same-day reload must not churn React state.
    expect(reconcileSnapshot(saved, PUZZLE)).toBe(saved);
  });

  it("drops the words of a replaced board and recomputes the score", () => {
    // The production case: the date is unchanged, the garden is not.
    const stale = snapshot({
      foundWords:  ["καλημερα", "θαλασσα", "αντι"],
      score:       420,
      currentRank: "Απολυτότητα",
    });

    const fixed = reconcileSnapshot(stale, PUZZLE);

    expect(fixed.foundWords).toEqual(["αντι"]);
    expect(fixed.score).toBe(1);
    // Rank falls out of the new board's own ceiling: 1 + 5 + 6 raw → max 9, so
    // a single flat 4-letter word is 11% of it — the second rung, not the top.
    expect(fixed.currentRank).toBe("Έτσι κιέτσι");
  });

  it("empties a round whose every word came from the old board", () => {
    const stale = snapshot({ foundWords: ["καλημερα"], score: 200, currentRank: "Φωτιά" });
    const fixed = reconcileSnapshot(stale, PUZZLE);

    expect(fixed.foundWords).toEqual([]);
    expect(fixed.score).toBe(0);
    expect(fixed.currentRank).toBe("Ψαράκι");
  });

  it("preserves a given-up round's flag while cleaning its words", () => {
    const stale = snapshot({ foundWords: ["καλημερα"], score: 200, givenUp: true });

    expect(reconcileSnapshot(stale, PUZZLE).givenUp).toBe(true);
  });
});
