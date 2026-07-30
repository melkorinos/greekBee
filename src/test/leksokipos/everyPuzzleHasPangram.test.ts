// Drift guard: every shipped Leksokipos daily puzzle must contain at least one
// pangram — a word using all 7 letters (normally the seed word). This is a genre
// invariant of Spelling-Bee-style puzzles: without it the pangram achievement lane
// (detectEarnedPangramTiers, pangram delta-posts) is unreachable and PANGRAM_BONUS
// is moot on that day (issue 09).
//
// batch-generate.ts enforces a pangram at CREATION time, but an accepted
// Leksikastirio Nomination that removes a word can later strip a board's only
// pangram during re-sync (scripts/lib/resync/leksokipos.ts). That regression
// produced 28 zero-pangram boards; this test is the backstop so a future
// dictionary re-sync can't silently reintroduce it.
//
// Note this guard is about a board having AT LEAST ONE pangram. The opposite
// bound — a letter set permitting absurdly MANY — is a separate quality gate
// (LEKSOKIPOS.MAX_PANGRAMS), asserted in puzzleCorpusQuality.test.ts.

import { describe, expect, it } from "vitest";

import { isPangram } from "@/games/leksokipos/lib/pangram";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import puzzles from "@/data/leksokipos/puzzles-el.json";

// The two legacy exceptions (2026-06-20, 2026-06-30) are GONE as of the
// 2026-07-30 difficulty rebalance. The prune + date reflow
// (scripts/prune-leksokipos-puzzles.ts) removed 209 boards and shifted every
// survivor onto a new date, so those two dates now hold entirely different
// puzzles — both of which have a pangram. The exemption had nothing left to
// exempt, so it was deleted rather than left as a dead allowlist.
//
// The invariant is now unconditional: EVERY shipped board has a pangram.

describe("every daily Leksokipos puzzle has a pangram", () => {
  const list = puzzles as LeksokiposPuzzle[];

  it("holds for every shipped board, with no exceptions", () => {
    const offenders = list
      .filter((p) => !p.validWords.some((w) => isPangram(w, p)))
      .map((p) => p.date);

    expect(offenders).toEqual([]);
  });
});
