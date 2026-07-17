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

import { describe, expect, it } from "vitest";

import { isPangram } from "@/games/leksokipos/lib/pangram";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import puzzles from "@/data/leksokipos/puzzles-el.json";

// Two boards that had already been played by the time issue 09 was fixed
// (2026-07-17). Their letter sets no longer have any pangram in the current
// dictionary, so they can't be salvaged in place — and rewriting an
// already-played board would rewrite history. Left as-is by decision; every
// FUTURE board must pass. See issue 09.
const LEGACY_NO_PANGRAM = new Set(["2026-06-20", "2026-06-30"]);

describe("every daily Leksokipos puzzle has a pangram", () => {
  const list = puzzles as LeksokiposPuzzle[];

  it("holds for all future boards (legacy already-played exceptions aside)", () => {
    const offenders = list
      .filter((p) => !LEGACY_NO_PANGRAM.has(p.date))
      .filter((p) => !p.validWords.some((w) => isPangram(w, p)))
      .map((p) => p.date);

    expect(offenders).toEqual([]);
  });

  it("still exempts exactly the two known legacy boards — no more, no fewer", () => {
    const legacyStillBroken = [...LEGACY_NO_PANGRAM].filter((date) => {
      const p = list.find((q) => q.date === date);
      return p && !p.validWords.some((w) => isPangram(w, p));
    });

    // If a legacy board ever regains a pangram (dictionary re-add), drop it from
    // the allowlist rather than leaving a dead exception.
    expect(legacyStillBroken.sort()).toEqual([...LEGACY_NO_PANGRAM].sort());
  });
});
