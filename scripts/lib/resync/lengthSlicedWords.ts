// lengthSlicedWords.ts — the shared engine behind every guess-list adapter.
//
// Two games read a guess list that is nothing more than words-el.json sliced by
// word length, and both live in src/data/leksiarxeio/words-{N}.json:
//
//   • Leksiarxeio  — lengths LEKSIARXEIO.LENGTHS (4–8), the lengths it is played at.
//   • Vres Tin Frasi — lengths VRESTIFRASI.SHORT_WORD_LENGTHS (2–3), which exist
//     only to validate the short function words its phrases are full of. It also
//     reads 4–8, but Leksiarxeio's adapter already owns those files.
//
// The slicing rule is identical for both, so it lives here once and each game
// binds it to the lengths it owns. The two length sets are DISJOINT by
// construction (a guard test pins that), which is what keeps two adapters from
// racing to write the same file.

import { readFileSync } from "fs";
import { join } from "path";

import { normalizeLetters } from "@/lib/normalize";

import type { DictionaryEdits, ResyncAdapter, ResyncChange, ResyncReport } from "./types";

export interface LengthSlicedWordsContent {
  /** Guess list per word length, keyed by the adapter's owned lengths. */
  byLength: Record<number, string[]>;
  /**
   * Lengths whose list actually changed. files() emits only these, so an
   * untouched bucket is never rewritten (and never shows up in the git diff).
   */
  dirty: number[];
}

/** Every length-sliced guess list lives in this one directory, whoever reads it. */
export const wordsPath = (n: number) =>
  join(__dirname, `../../../src/data/leksiarxeio/words-${n}.json`);

const lengthOf = (word: string) => [...word].length;

/**
 * Builds the adapter for one game's slice of the length-keyed guess lists.
 * `lengths` is the set of buckets this adapter owns — and only those; a word of
 * any other length is another adapter's business, or nobody's.
 */
export function createLengthSlicedWordsAdapter(
  id: string,
  lengths: readonly number[],
): ResyncAdapter<LengthSlicedWordsContent> {
  function resync(
    content: LengthSlicedWordsContent,
    { added, removed }: DictionaryEdits,
  ): { content: LengthSlicedWordsContent; report: ResyncReport } {
    const addedNorm = [...new Set(added.map(normalizeLetters))];
    const removedNorm = new Set(removed.map(normalizeLetters));

    const byLength: Record<number, string[]> = { ...content.byLength };
    const dirty: number[] = [];
    const changed: ResyncChange[] = [];

    for (const n of lengths) {
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

    // Every edit here is auto-fixable: a guess list is a pure projection of the
    // dictionary, so there is nothing a human needs to action.
    return { content: { byLength, dirty }, report: { changed, warnings: [] } };
  }

  return {
    id,

    load: () => {
      const byLength: Record<number, string[]> = {};
      for (const n of lengths) {
        byLength[n] = JSON.parse(readFileSync(wordsPath(n), "utf8")) as string[];
      }
      return { byLength, dirty: [] };
    },

    resync,

    // Only the buckets that actually changed — an untouched words-{N}.json is
    // never rewritten. Compact JSON, sorted; matches how the lists are stored.
    files: ({ byLength, dirty }) =>
      dirty.map((n) => ({
        path: wordsPath(n),
        contents: JSON.stringify([...byLength[n]].sort()),
      })),
  };
}
