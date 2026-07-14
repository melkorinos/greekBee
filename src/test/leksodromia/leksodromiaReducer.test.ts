// leksodromiaReducer.test.ts — all state transitions of the anagram sprint.
// The reducer is pure and never reads Date.now(): elapsed time arrives as the
// SUBMIT_WORD/SKIP_WORD payload from the clock hook. Input is tile-based:
// `picked` holds indices into the scrambled word, hints lock a prefix of
// correct tiles (lockedTileIdxs) and clear free picks.

import { describe, expect, it } from "vitest";

import {
  getAvailableTileIndices,
  getCurrentAnswer,
  getCurrentInput,
  getRetryBaseElapsedMs,
  getTotalScore,
  getTotalSteps,
  isSecondChance,
  leksodromiaReducer,
  makeInitialLeksodromiaState,
} from "@/games/leksodromia/lib/leksodromiaReducer";
import type { LeksodromiaState } from "@/games/leksodromia/types";
import { computeWordPoints } from "@/games/leksodromia/lib/scoring";

// 10-word fixture round (2 × lengths 4–8, ascending) with hand-made scrambles.
// Words use σ only (never ς) — matching the answer pools' normalized form.
const WORDS = [
  "αυγο", "βημα",
  "αγορα", "βαρκα",
  "γραμμα", "δασκοσ",
  "αγγελοσ", "βαθμιδα",
  "αγκαλιεσ", "βαρκαρησ",
];
const SCRAMBLES = [
  "γοαυ", "μαβη",
  "ρααγο", "καβαρ",
  "αμγμρα", "σοκαδσ",
  "γλοσαγε", "μιδαβαθ",
  "λακιεσγα", "ρσηκβααρ",
];

function fresh(): LeksodromiaState {
  return makeInitialLeksodromiaState("2026-07-13", WORDS, SCRAMBLES);
}

/** Solve the current word by picking its tiles via keyboard letters, then submit. */
function solveCurrent(state: LeksodromiaState, elapsedMs = 0): LeksodromiaState {
  const answer = getCurrentAnswer(state); // retry-aware (second-chance steps redirect)
  let s = state;
  for (const letter of answer.slice(getCurrentInput(s).length)) {
    s = leksodromiaReducer(s, { type: "ADD_LETTER", letter });
  }
  return leksodromiaReducer(s, { type: "SUBMIT_WORD", elapsedMs });
}

describe("makeInitialLeksodromiaState", () => {
  it("starts at word 0, playing, with empty input and no results", () => {
    const s = fresh();
    expect(s.wordIndex).toBe(0);
    expect(s.status).toBe("playing");
    expect(getCurrentInput(s)).toBe("");
    expect(s.results).toEqual([]);
    expect(getTotalScore(s)).toBe(0);
  });
});

describe("PICK_TILE / ADD_LETTER / REMOVE_LETTER", () => {
  it("picking a tile appends its letter to the current input", () => {
    let s = fresh(); // scramble "γοαυ"
    s = leksodromiaReducer(s, { type: "PICK_TILE", tileIndex: 2 }); // α
    s = leksodromiaReducer(s, { type: "PICK_TILE", tileIndex: 3 }); // υ
    expect(getCurrentInput(s)).toBe("αυ");
    expect(getAvailableTileIndices(s)).toEqual([0, 1]);
  });

  it("an already-picked tile cannot be picked twice", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "PICK_TILE", tileIndex: 2 });
    s = leksodromiaReducer(s, { type: "PICK_TILE", tileIndex: 2 });
    expect(getCurrentInput(s)).toBe("α");
  });

  it("ADD_LETTER (keyboard) picks the first available tile with that letter — duplicates resolve to distinct tiles", () => {
    let s = fresh();
    // Jump to word 5 "γραμμα" (scramble "αμγμρα" — two α, two μ)
    s = leksodromiaReducer(s, { type: "RESTORE_STATE", wordIndex: 4, results: [], currentHintsUsed: 0, retries: {} });
    s = leksodromiaReducer(s, { type: "ADD_LETTER", letter: "α" });
    s = leksodromiaReducer(s, { type: "ADD_LETTER", letter: "α" });
    s = leksodromiaReducer(s, { type: "ADD_LETTER", letter: "α" });
    expect(getCurrentInput(s)).toBe("αα"); // third α: no tile left → no-op
  });

  it("ADD_LETTER with a letter not on the rack is a no-op", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "ADD_LETTER", letter: "ω" });
    expect(getCurrentInput(s)).toBe("");
  });

  it("input cannot grow beyond the word length", () => {
    let s = fresh();
    for (const letter of "αυγο") s = leksodromiaReducer(s, { type: "ADD_LETTER", letter });
    s = leksodromiaReducer(s, { type: "PICK_TILE", tileIndex: 0 });
    expect(getCurrentInput(s)).toBe("αυγο");
  });

  it("REMOVE_LETTER pops the last picked tile; empty input is a no-op", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "PICK_TILE", tileIndex: 2 });
    s = leksodromiaReducer(s, { type: "REMOVE_LETTER" });
    expect(getCurrentInput(s)).toBe("");
    expect(leksodromiaReducer(s, { type: "REMOVE_LETTER" })).toBe(s);
  });
});

describe("CLEAR_INPUT", () => {
  it("drops every free pick in one action", () => {
    let s = fresh();
    for (const letter of "αυγ") s = leksodromiaReducer(s, { type: "ADD_LETTER", letter });
    s = leksodromiaReducer(s, { type: "CLEAR_INPUT" });
    expect(getCurrentInput(s)).toBe("");
    expect(s.picked).toEqual([]);
  });

  it("keeps the hint-locked prefix, clearing only the free picks", () => {
    let s = fresh(); // answer "αυγο", scramble "γοαυ"
    s = leksodromiaReducer(s, { type: "USE_HINT" });          // lock "α"
    s = leksodromiaReducer(s, { type: "ADD_LETTER", letter: "υ" });
    s = leksodromiaReducer(s, { type: "CLEAR_INPUT" });
    expect(getCurrentInput(s)).toBe("α");
  });

  it("clears the shake flag and is a no-op on empty untouched input", () => {
    const s = fresh();
    expect(leksodromiaReducer(s, { type: "CLEAR_INPUT" })).toBe(s);
  });
});

describe("SUBMIT_WORD", () => {
  it("correct submit records a solved result with decay-scored points and advances", () => {
    const s = solveCurrent(fresh(), 10_000);
    expect(s.wordIndex).toBe(1);
    expect(getCurrentInput(s)).toBe("");
    expect(s.results).toEqual([
      {
        word: "αυγο",
        status: "solved",
        elapsedMs: 10_000,
        hintsUsed: 0,
        points: computeWordPoints(10_000, 4, 0),
      },
    ]);
  });

  it("wrong submit sets the shake flag, clears the free picks, records nothing", () => {
    let s = fresh();
    for (const letter of "γοαυ") s = leksodromiaReducer(s, { type: "ADD_LETTER", letter });
    s = leksodromiaReducer(s, { type: "SUBMIT_WORD", elapsedMs: 5_000 });
    expect(s.wrongSubmit).toBe(true);
    expect(getCurrentInput(s)).toBe(""); // auto-cleared for an instant retry
    expect(s.picked).toEqual([]);
    expect(s.results).toEqual([]);
    expect(s.wordIndex).toBe(0);
  });

  it("a wrong submit keeps the hint-locked prefix, clearing only the free picks", () => {
    let s = fresh(); // answer "αυγο", scramble "γοαυ"
    s = leksodromiaReducer(s, { type: "USE_HINT" });               // lock "α"
    for (const letter of "υογ") s = leksodromiaReducer(s, { type: "ADD_LETTER", letter });
    s = leksodromiaReducer(s, { type: "SUBMIT_WORD", elapsedMs: 5_000 });
    expect(s.wrongSubmit).toBe(true);
    expect(getCurrentInput(s)).toBe("α"); // locked prefix survives
  });

  it("the shake flag clears on the next input action", () => {
    let s = fresh();
    for (const letter of "γοαυ") s = leksodromiaReducer(s, { type: "ADD_LETTER", letter });
    s = leksodromiaReducer(s, { type: "SUBMIT_WORD", elapsedMs: 5_000 });
    s = leksodromiaReducer(s, { type: "ADD_LETTER", letter: "α" });
    expect(s.wrongSubmit).toBe(false);
  });

  it("incomplete input does not submit", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "ADD_LETTER", letter: "α" });
    const after = leksodromiaReducer(s, { type: "SUBMIT_WORD", elapsedMs: 1_000 });
    expect(after.results).toEqual([]);
    expect(after.wordIndex).toBe(0);
  });
});

describe("USE_HINT", () => {
  it("reveals the next answer letter as a locked tile and clears free picks", () => {
    let s = fresh(); // answer "αυγο", scramble "γοαυ"
    s = leksodromiaReducer(s, { type: "PICK_TILE", tileIndex: 0 }); // γ
    s = leksodromiaReducer(s, { type: "USE_HINT" });
    expect(s.hintsUsed).toBe(1);
    expect(getCurrentInput(s)).toBe("α"); // locked prefix only
    expect(s.lockedTileIdxs).toEqual([2]); // the α tile
  });

  it("is capped at MAX_HINTS_PER_WORD", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "USE_HINT" });
    s = leksodromiaReducer(s, { type: "USE_HINT" });
    const third = leksodromiaReducer(s, { type: "USE_HINT" });
    expect(third.hintsUsed).toBe(2);
    expect(third.lockedTileIdxs).toHaveLength(2);
    expect(getCurrentInput(third)).toBe("αυ");
  });

  it("REMOVE_LETTER never removes the locked prefix", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "USE_HINT" });
    s = leksodromiaReducer(s, { type: "REMOVE_LETTER" });
    expect(getCurrentInput(s)).toBe("α");
  });

  it("hints charge into the solved word's points", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "USE_HINT" });
    s = solveCurrent(s, 0);
    expect(s.results[0].hintsUsed).toBe(1);
    expect(s.results[0].points).toBe(computeWordPoints(0, 4, 1));
  });

  it("hint counter resets for the next word", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "USE_HINT" });
    s = solveCurrent(s);
    expect(s.hintsUsed).toBe(0);
    expect(s.lockedTileIdxs).toEqual([]);
  });
});

describe("SKIP_WORD — second chance", () => {
  it("the first skip requeues the word at the end instead of recording a result", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "SKIP_WORD", elapsedMs: 30_000 });
    expect(s.wordIndex).toBe(1);
    expect(s.results).toEqual([]); // nothing final yet
    expect(getTotalSteps(s)).toBe(11); // the run grew by one step
    expect(s.retries[10]).toEqual({ origIndex: 0, baseElapsedMs: 30_000, baseHints: 0 });
  });

  it("the requeued word comes around as a second chance with its clock base", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "SKIP_WORD", elapsedMs: 30_000 }); // skip αυγο
    for (let i = 1; i < WORDS.length; i++) s = solveCurrent(s);          // solve the rest
    expect(s.status).toBe("playing"); // the second chance is still pending
    expect(s.wordIndex).toBe(10);
    expect(isSecondChance(s)).toBe(true);
    expect(getCurrentAnswer(s)).toBe("αυγο");
    expect(getRetryBaseElapsedMs(s)).toBe(30_000);
  });

  it("solving on the second chance scores with the resumed (cumulative) clock", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "SKIP_WORD", elapsedMs: 30_000 });
    for (let i = 1; i < WORDS.length; i++) s = solveCurrent(s);
    s = solveCurrent(s, 40_000); // cumulative: 30 s before the skip + 10 s now
    expect(s.status).toBe("finished");
    const retryResult = s.results.at(-1)!;
    expect(retryResult).toEqual({
      word: "αυγο",
      status: "solved",
      elapsedMs: 40_000,
      hintsUsed: 0,
      points: computeWordPoints(40_000, 4, 0),
    });
  });

  it("hints taken before the skip carry into the second chance", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "USE_HINT" }); // lock "α" on αυγο
    s = leksodromiaReducer(s, { type: "SKIP_WORD", elapsedMs: 5_000 });
    for (let i = 1; i < WORDS.length; i++) s = solveCurrent(s);
    expect(isSecondChance(s)).toBe(true);
    expect(s.hintsUsed).toBe(1); // resumed, not reset
    expect(getCurrentInput(s)).toBe("α"); // prefix re-locked
  });

  it("skipping the second chance is final: 0 points into the results", () => {
    let s = fresh();
    s = leksodromiaReducer(s, { type: "SKIP_WORD", elapsedMs: 30_000 });
    for (let i = 1; i < WORDS.length; i++) s = solveCurrent(s);
    s = leksodromiaReducer(s, { type: "SKIP_WORD", elapsedMs: 35_000 });
    expect(s.status).toBe("finished");
    expect(getTotalSteps(s)).toBe(11); // no re-requeue
    expect(s.results.at(-1)).toEqual({
      word: "αυγο",
      status: "skipped",
      elapsedMs: 35_000,
      hintsUsed: 0,
      points: 0,
    });
  });
});

describe("round end", () => {
  it("skipping everything twice finishes the round; terminal state ignores further actions", () => {
    let s = fresh();
    // First pass: every skip requeues — the round must NOT finish.
    for (let i = 0; i < WORDS.length; i++) {
      s = leksodromiaReducer(s, { type: "SKIP_WORD", elapsedMs: 1_000 });
    }
    expect(s.status).toBe("playing");
    expect(s.results).toHaveLength(0);
    // Second pass: every skip is final.
    for (let i = 0; i < WORDS.length; i++) {
      s = leksodromiaReducer(s, { type: "SKIP_WORD", elapsedMs: 2_000 });
    }
    expect(s.status).toBe("finished");
    expect(s.results).toHaveLength(10);
    expect(leksodromiaReducer(s, { type: "ADD_LETTER", letter: "α" })).toBe(s);
    expect(leksodromiaReducer(s, { type: "SKIP_WORD", elapsedMs: 0 })).toBe(s);
    expect(leksodromiaReducer(s, { type: "USE_HINT" })).toBe(s);
  });

  it("getTotalScore sums solved points across mixed solves and skips", () => {
    let s = fresh();
    s = solveCurrent(s, 0);                                        // 60
    s = leksodromiaReducer(s, { type: "SKIP_WORD", elapsedMs: 0 }); // 0
    s = solveCurrent(s, 45_000);                                   // floor: 20
    expect(getTotalScore(s)).toBe(
      computeWordPoints(0, 4, 0) + computeWordPoints(45_000, 5, 0),
    );
  });
});

describe("RESTORE_STATE", () => {
  it("restores word index, results, and re-locks the hinted prefix", () => {
    const results = [
      { word: "αυγο", status: "solved" as const, elapsedMs: 5_000, hintsUsed: 0, points: 55 },
    ];
    let s = fresh();
    s = leksodromiaReducer(s, { type: "RESTORE_STATE", wordIndex: 1, results, currentHintsUsed: 1, retries: {} });
    expect(s.wordIndex).toBe(1);
    expect(s.results).toEqual(results);
    expect(s.hintsUsed).toBe(1);
    expect(getCurrentInput(s)).toBe("β"); // answer "βημα" — first letter re-revealed
    expect(s.status).toBe("playing");
  });

  it("restoring a completed round lands in finished state", () => {
    const results = WORDS.map((word) => ({
      word, status: "skipped" as const, elapsedMs: 0, hintsUsed: 0, points: 0,
    }));
    let s = fresh();
    s = leksodromiaReducer(s, { type: "RESTORE_STATE", wordIndex: 10, results, currentHintsUsed: 0, retries: {} });
    expect(s.status).toBe("finished");
  });

  it("restores a pending second chance — retry redirect, playing status", () => {
    let s = fresh();
    s = leksodromiaReducer(s, {
      type: "RESTORE_STATE",
      wordIndex: 10,
      results: [],
      currentHintsUsed: 0,
      retries: { 10: { origIndex: 0, baseElapsedMs: 30_000, baseHints: 0 } },
    });
    expect(s.status).toBe("playing");
    expect(isSecondChance(s)).toBe(true);
    expect(getCurrentAnswer(s)).toBe("αυγο");
    expect(getRetryBaseElapsedMs(s)).toBe(30_000);
  });
});
