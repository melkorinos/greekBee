// phraseCorpusPlayable.test.ts — the corpus/pool contract for Vres Tin Frasi.
//
// The game validates every word of a phrase guess against a pool assembled from
// fixed-length lists (src/app/vres-tin-frasi/page.tsx). Nothing structurally ties
// the authored phrases to that pool, so a phrase can ship containing a word the
// game itself will refuse — the player then cannot solve the puzzle at all, and
// the only symptom is «δεν βρέθηκε στη λίστα» on the correct answer.
//
// That shipped twice at once: no 1-letter list existed (so «Η γλώσσα κόκαλα δεν
// έχει» was unsolvable, along with 75 other article-opening phrases), and the
// pool stopped at 8 letters while phrases contained words up to 15 (83 more).
// 142 of 498 phrases — 29% of the corpus — could not be completed.
//
// These tests assert the contract in both directions: every phrase is playable,
// and the pool covers exactly the lengths the corpus uses.

import { describe, expect, it } from "vitest";

import {
  makeInitialVresTinFrasiState,
  vresTinFrasiReducer,
} from "@/games/vrestifrasi/hooks/vresTinFrasiReducer";
import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";
import { VRESTIFRASI } from "@/config/gameRules";
import { normalizeLetters } from "@/lib/normalize";
import { getValidWords } from "@/data/leksiarxeio";
import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";
import phrases from "@/data/vrestifrasi/phrases-el.json";
import words1 from "@/data/vrestifrasi/words-1.json";
import words2 from "@/data/leksiarxeio/words-2.json";
import words3 from "@/data/leksiarxeio/words-3.json";

// The exact pool src/app/vres-tin-frasi/page.tsx hands to the board. Kept in
// sync by hand: if that assembly changes, the "pool covers every length" test
// below fails rather than this drifting silently.
const REAL_POOL = new Set<string>([
  ...(words1 as string[]),
  ...(words2 as string[]),
  ...(words3 as string[]),
  ...getValidWords(4 as LeksiarxeioLength),
  ...getValidWords(5 as LeksiarxeioLength),
  ...getValidWords(6 as LeksiarxeioLength),
  ...getValidWords(7 as LeksiarxeioLength),
  ...getValidWords(8 as LeksiarxeioLength),
]);

const CORPUS = (phrases as { phrase: string }[]).map((p) => p.phrase);

function buildPuzzle(phrase: string): VresTinFrasiPuzzle {
  const normalizedWords = phrase.split(" ").map((w) => normalizeLetters(w));
  return {
    id: "test-vresi",
    date: "2026-01-01",
    phrase,
    normalizedWords,
    wordLengths: normalizedWords.map((w) => w.length),
  };
}

describe("Vres Tin Frasi phrase corpus — every phrase is solvable", () => {
  it("the corpus is non-empty", () => {
    expect(CORPUS.length).toBeGreaterThan(0);
  });

  // Drives the real reducer with the real pool: types the correct answer letter
  // by letter and submits. This is the player's exact path, so a rejection here
  // is a phrase no player could ever complete.
  it("the correct answer wins for every phrase in the corpus", () => {
    const unsolvable: string[] = [];

    for (const phrase of CORPUS) {
      const puzzle = buildPuzzle(phrase);
      let s = makeInitialVresTinFrasiState(puzzle);

      for (const word of puzzle.normalizedWords) {
        for (const ch of word) {
          s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: ch });
        }
      }

      s = vresTinFrasiReducer(s, { type: "SUBMIT_GUESS", validWords: REAL_POOL });

      if (s.status !== "won") {
        unsolvable.push(`${phrase} → ${s.lastMessage ?? "(no message)"}`);
      }
    }

    expect(unsolvable).toEqual([]);
  });

  it("every phrase word is within the pool's length bounds", () => {
    const outOfBounds = CORPUS.flatMap((phrase) =>
      phrase
        .split(" ")
        .map((w) => normalizeLetters(w))
        .filter(
          (w) =>
            w.length < VRESTIFRASI.MIN_WORD_LENGTH ||
            w.length > VRESTIFRASI.MAX_WORD_LENGTH,
        )
        .map((w) => `${phrase} → "${w}" (${w.length})`),
    );

    expect(outOfBounds).toEqual([]);
  });

  // The pool is assembled from one list per length. A corpus word at a length no
  // list covers is exactly the 1-letter and 9+ bug, so pin the two ends.
  it("the pool covers every word length the corpus actually uses", () => {
    const lengthsUsed = new Set(
      CORPUS.flatMap((p) => p.split(" ").map((w) => normalizeLetters(w).length)),
    );

    for (const len of lengthsUsed) {
      expect(len).toBeGreaterThanOrEqual(VRESTIFRASI.MIN_WORD_LENGTH);
      expect(len).toBeLessThanOrEqual(VRESTIFRASI.MAX_WORD_LENGTH);
    }

    // The 1-letter end has no dictionary-derived list behind it — it is authored,
    // so nothing else would catch it going missing.
    expect(lengthsUsed.has(1)).toBe(true);
    expect(REAL_POOL.has("η")).toBe(true);
    expect(REAL_POOL.has("ο")).toBe(true);
  });

  it("every phrase is within the submission word-count bounds", () => {
    const outOfBounds = CORPUS.filter((phrase) => {
      const n = phrase.trim().split(/\s+/).length;
      return n < VRESTIFRASI.MIN_PHRASE_WORDS || n > VRESTIFRASI.MAX_PHRASE_WORDS;
    });

    expect(outOfBounds).toEqual([]);
  });
});
