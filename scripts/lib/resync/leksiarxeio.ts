// leksiarxeio.ts — re-sync adapter for the Leksiarxeio guess lists.
//
// Leksiarxeio ships one guess list per word length (words-{4..8}.json), each a
// length-filtered slice of words-el.json. A dictionary edit that never reaches
// them leaves the game accepting a deleted word, or rejecting an added one.
//
// Scope: words-{N}.json ONLY. The sibling answers-{N}.json files are curated
// answer pools — a human picks what the game asks players to guess — so a
// Nomination must never touch them.
//
// Words outside LEKSIARXEIO.LENGTHS (len ≤ 3, len > 8) live in words-el.json and
// nowhere else; for them this adapter is correctly a no-op.

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { LEKSIARXEIO } from "@/config/gameRules";
import { normalizeLetters } from "@/lib/normalize";

import type { DictionaryEdits, ResyncAdapter, ResyncChange, ResyncReport } from "./types";

const LENGTHS: readonly number[] = LEKSIARXEIO.LENGTHS;

export interface LeksiarxeioResyncContent {
  /** Guess list per word length, keyed by LEKSIARXEIO.LENGTHS. */
  byLength: Record<number, string[]>;
  /**
   * Lengths whose list actually changed. write() writes only these, so an
   * untouched bucket is never rewritten (and never shows up in the git diff).
   */
  dirty: number[];
}

const wordsPath = (n: number) => join(__dirname, `../../../src/data/leksiarxeio/words-${n}.json`);

const lengthOf = (word: string) => [...word].length;

function resync(
  content: LeksiarxeioResyncContent,
  { added, removed }: DictionaryEdits,
): { content: LeksiarxeioResyncContent; report: ResyncReport } {
  const addedNorm = [...new Set(added.map(normalizeLetters))];
  const removedNorm = new Set(removed.map(normalizeLetters));

  const byLength: Record<number, string[]> = { ...content.byLength };
  const dirty: number[] = [];
  const changed: ResyncChange[] = [];

  for (const n of LENGTHS) {
    const current = byLength[n] ?? [];
    const present = new Set(current.map(normalizeLetters));

    const removedHere: string[] = [];
    const addedHere: string[] = [];

    // Removals: drop any listed word that was deleted from the dictionary.
    let kept = current;
    if (removedNorm.size > 0) {
      kept = current.filter((w) => {
        const norm = normalizeLetters(w);
        if (lengthOf(norm) === n && removedNorm.has(norm)) {
          removedHere.push(norm);
          return false;
        }
        return true;
      });
    }

    // Additions: append words of exactly this length that the list is missing.
    for (const word of addedNorm) {
      if (lengthOf(word) !== n) continue; // belongs to another bucket
      if (removedNorm.has(word)) continue; // removal wins
      if (present.has(word)) continue; // already listed
      kept = kept === current ? [...current] : kept;
      kept.push(word);
      addedHere.push(word);
    }

    if (removedHere.length === 0 && addedHere.length === 0) {
      continue; // untouched — leave the original array in place
    }

    byLength[n] = kept;
    dirty.push(n);
    changed.push({ id: `words-${n}.json`, added: addedHere, removed: removedHere });
  }

  // Every Leksiarxeio edit is auto-fixable: the guess list is a pure projection
  // of the dictionary, so there is nothing a human needs to action.
  return { content: { byLength, dirty }, report: { changed, warnings: [] } };
}

export const leksiarxeioAdapter: ResyncAdapter<LeksiarxeioResyncContent> = {
  id: "leksiarxeio",

  load: () => {
    const byLength: Record<number, string[]> = {};
    for (const n of LENGTHS) {
      byLength[n] = JSON.parse(readFileSync(wordsPath(n), "utf8")) as string[];
    }
    return { byLength, dirty: [] };
  },

  resync,

  write: ({ byLength, dirty }) => {
    for (const n of dirty) {
      writeFileSync(wordsPath(n), JSON.stringify([...byLength[n]].sort()), "utf8");
    }
  },
};
