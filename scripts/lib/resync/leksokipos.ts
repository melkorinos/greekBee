// leksokipos.ts — re-sync adapter for the pre-built Leksokipos puzzles.
//
// Every Pre-built Puzzle stores its own pre-computed `validWords` array. When a
// word is added to or removed from words-el.json (via an accepted Leksikastirio
// Nomination), those embedded arrays go stale:
//   - a removed word stays scoreable in every puzzle that listed it (a bug);
//   - an added word never becomes scoreable in puzzles whose 7 letters cover it.
//
// A word's validity for a given puzzle is fully self-contained (does the puzzle's
// letter set cover it, and does it contain the centre letter?), so we patch
// surgically — no dictionary scan, original word order preserved, minimal git diff.
//
// The validity rule is NOT reimplemented here: we call the real game predicate,
// computeValidWords(), with a single-word list. That keeps one source of truth
// (including LEKSOKIPOS.MIN_WORD_LENGTH) at the cost of rebuilding a 7-element
// Set per check — irrelevant for a script, and it means this can never drift
// from what the game actually scores.

import { readFileSync } from "fs";
import { join } from "path";

import { computeValidWords } from "@/games/leksokipos/lib/computeValidWords";
import { normalizeLetters } from "@/lib/normalize";

import type { DictionaryEdits, ResyncAdapter, ResyncChange, ResyncReport } from "./types";

interface LeksokiposPuzzle {
  id?: string;
  centerLetter: string;
  outerLetters: string[];
  validWords: string[];
}

export type LeksokiposResyncContent = LeksokiposPuzzle[];

// puzzles-el.json is pretty-printed (2-space) by batch-generate.ts — match it.
const puzzlesElPath = join(__dirname, "../../../src/data/leksokipos/puzzles-el.json");

/**
 * True when this puzzle should score `normWord`. Delegates to the real game
 * predicate rather than mirroring its rules.
 */
function puzzleAcceptsWord(puzzle: LeksokiposPuzzle, normWord: string): boolean {
  return computeValidWords(puzzle.centerLetter, puzzle.outerLetters, [normWord]).length > 0;
}

function resync(
  puzzles: LeksokiposResyncContent,
  { added, removed }: DictionaryEdits,
): { content: LeksokiposResyncContent; report: ResyncReport } {
  const addedNorm = [...new Set(added.map(normalizeLetters))];
  const removedNorm = new Set(removed.map(normalizeLetters));

  const changed: ResyncChange[] = [];

  const next = puzzles.map((puzzle) => {
    const current = puzzle.validWords;
    const present = new Set(current.map(normalizeLetters));

    const removedHere: string[] = [];
    const addedHere: string[] = [];

    // Removals: drop any listed word that was deleted from the dictionary.
    let kept = current;
    if (removedNorm.size > 0) {
      kept = current.filter((w) => {
        const n = normalizeLetters(w);
        if (removedNorm.has(n)) {
          removedHere.push(n);
          return false;
        }
        return true;
      });
    }

    // Additions: append newly-valid words this puzzle should now accept.
    for (const n of addedNorm) {
      if (removedNorm.has(n)) continue; // removal wins
      if (present.has(n)) continue; // already listed
      if (puzzleAcceptsWord(puzzle, n)) {
        kept = kept === current ? [...current] : kept;
        kept.push(n);
        addedHere.push(n);
      }
    }

    if (removedHere.length === 0 && addedHere.length === 0) {
      return puzzle; // untouched — preserve identity so the writer can skip it
    }

    changed.push({ id: puzzle.id, added: addedHere, removed: removedHere });
    return { ...puzzle, validWords: kept };
  });

  // Every Leksokipos edit is auto-fixable: validWords is derived data with no
  // curated geometry behind it, so there is nothing a human needs to action.
  return { content: next, report: { changed, warnings: [] } };
}

export const leksokiposAdapter: ResyncAdapter<LeksokiposResyncContent> = {
  id: "leksokipos",
  load: () => JSON.parse(readFileSync(puzzlesElPath, "utf8")) as LeksokiposResyncContent,
  resync,
  // Pretty-printed (2-space) — match batch-generate.ts exactly.
  files: (puzzles) => [{ path: puzzlesElPath, contents: JSON.stringify(puzzles, null, 2) }],
};
