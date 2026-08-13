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

import { LEKSOKIPOS } from "@/config/gameRules";
import { computeValidWords } from "@/games/leksokipos/lib/computeValidWords";
import type { LeksokiposPuzzle as ShippedPuzzle } from "@/games/leksokipos/types";
import { normalizeLetters } from "@/lib/normalize";

import { realisticWordsToGenius } from "../leksokipos/puzzleQuality";
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

/**
 * True when at least one word in `words` uses all 7 of the puzzle's letters.
 * A daily board is expected to always have one (issue 09) — losing the last one
 * to a dictionary removal breaks the genre invariant and can't be auto-fixed
 * (the letter set may have no other pangram in the dictionary), so it's a warning.
 */
function hasPangram(puzzle: LeksokiposPuzzle, words: string[]): boolean {
  const letters = [puzzle.centerLetter, ...puzzle.outerLetters].map(normalizeLetters);
  return words.some((w) => {
    const n = normalizeLetters(w);
    return letters.every((l) => n.includes(l));
  });
}

/**
 * The board's tedium index, measured with the real generation-time gate rather
 * than a copy of it. The gate reads only the letter set and the word list, so
 * the metadata this adapter's puzzle shape omits is filled with placeholders
 * that cannot reach the number.
 */
function wordsToGenius(puzzle: LeksokiposPuzzle, words: string[]): number {
  return realisticWordsToGenius({
    id: puzzle.id ?? "",
    language: "el",
    date: "",
    centerLetter: puzzle.centerLetter,
    outerLetters: puzzle.outerLetters,
    validWords: words,
  } satisfies ShippedPuzzle);
}

function resync(
  puzzles: LeksokiposResyncContent,
  { added, removed }: DictionaryEdits,
): { content: LeksokiposResyncContent; report: ResyncReport } {
  const addedNorm = [...new Set(added.map(normalizeLetters))];
  const removedNorm = new Set(removed.map(normalizeLetters));

  const changed: ResyncChange[] = [];
  const warnings: string[] = [];

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

    // A removal that strips this board's last pangram can't be auto-fixed here
    // (this adapter only patches the listed words; it never re-rolls the letter
    // set), and the letter set may have no other pangram in the dictionary. Flag
    // it so a human regenerates the board (issue 09). Only worth checking when a
    // removal happened and the board had a pangram before.
    if (removedHere.length > 0 && hasPangram(puzzle, current) && !hasPangram(puzzle, kept)) {
      warnings.push(
        `${puzzle.id ?? "(unknown puzzle)"}: removal left this board with no pangram — regenerate its letter set (issue 09).`,
      );
    }

    // A dictionary edit can push a board past the tedium ceiling months after it
    // was generated, and the corpus guard test only says so two steps later —
    // after the write, in a run the operator did not connect to a word list.
    // Report it at the moment it happens instead, which means --dry-run shows it
    // before anything is written. Only a CROSSING is worth a line: a board that
    // was already over stays the corpus's problem, not this run's.
    const before = wordsToGenius(puzzle, current);
    const after = wordsToGenius(puzzle, kept);
    if (before < LEKSOKIPOS.MAX_WORDS_TO_GENIUS && after >= LEKSOKIPOS.MAX_WORDS_TO_GENIUS) {
      warnings.push(
        `${puzzle.id ?? "(unknown puzzle)"}: this edit took the board from ${before} to ${after} ` +
          `words to the top rank, at or past the ceiling of ${LEKSOKIPOS.MAX_WORDS_TO_GENIUS} — ` +
          `puzzleCorpusQuality.test.ts will fail on it. Fix it by re-rolling this one date's letter ` +
          `set, not by pruning: a prune re-dates every later puzzle in the corpus.`,
      );
    }

    changed.push({ id: puzzle.id, added: addedHere, removed: removedHere });
    return { ...puzzle, validWords: kept };
  });

  // validWords is derived data with no curated geometry, so word-level edits are
  // auto-fixed. What isn't: a removal stripping a board's last pangram, and an
  // edit pushing a board past the tedium ceiling (see warnings above). Both need
  // a human to re-roll that date's letter set.
  return { content: next, report: { changed, warnings } };
}

export const leksokiposAdapter: ResyncAdapter<LeksokiposResyncContent> = {
  id: "leksokipos",
  load: () => JSON.parse(readFileSync(puzzlesElPath, "utf8")) as LeksokiposResyncContent,
  resync,
  // Pretty-printed (2-space) — match batch-generate.ts exactly.
  files: (puzzles) => [{ path: puzzlesElPath, contents: JSON.stringify(puzzles, null, 2) }],
};
