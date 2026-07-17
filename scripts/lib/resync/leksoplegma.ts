// leksoplegma.ts — re-sync adapter for the pre-built Leksoplegma boards.
//
// Each board stores `bonusWords`: every extra word traceable along its required-
// edge web, enumerated by the generator against words-el.json. That makes them
// dictionary-derived, and therefore stale the moment a Nomination lands:
//   - a removed word keeps scoring BONUS_WORD_POINTS on every board listing it;
//   - an added word never scores on boards that can trace it.
//
// The acceptance rule is not reimplemented here — it is the same predicate the
// generator applies (canTrace over edgesOf(paths)), with the same guards
// enumerateBonusWords() uses: at least BONUS_MIN_LENGTH, no longer than the
// board, and never a required word.
//
// ── The part that CANNOT be auto-fixed ───────────────────────────────────────
// `paths` (required words) come from curated pools and are baked into the grid
// geometry: the tiles, the drawn edges, and every bonus word's traceability all
// derive from them. So:
//   - an add can never enter `paths` (a board's geometry is fixed at generation);
//   - removing a word that IS a required word would invalidate the board.
// We refuse to touch `paths` and emit a warning naming the board instead. The
// operator regenerates it (npm run generate-leksoplegma) — silently mutating
// curated geometry from a word-list script would be far worse than a loud stop.

import { readFileSync } from "fs";
import { join } from "path";

import { BONUS_MIN_LENGTH, canTrace } from "@/games/leksoplegma/lib/generator";
import { edgesOf } from "@/games/leksoplegma/lib/graph";
import { normalizeLetters } from "@/lib/normalize";
import type { LeksoplegmaPuzzle } from "@/games/leksoplegma/types";

import type { DictionaryEdits, ResyncAdapter, ResyncChange, ResyncReport } from "./types";

export type LeksoplegmaResyncContent = LeksoplegmaPuzzle[];

const puzzlesPath = join(__dirname, "../../../src/data/leksoplegma/puzzles-el.json");

/**
 * True when this board should score `word` as a bonus word — same rules the
 * generator's enumerateBonusWords() applies when it builds the list.
 */
function boardAcceptsBonus(
  puzzle: LeksoplegmaPuzzle,
  word: string,
  required: Set<string>,
  edges: ReadonlySet<string>,
): boolean {
  return (
    word.length >= BONUS_MIN_LENGTH &&
    word.length <= puzzle.letters.length &&
    !required.has(word) &&
    canTrace(word, puzzle.letters, edges)
  );
}

function resync(
  puzzles: LeksoplegmaResyncContent,
  { added, removed }: DictionaryEdits,
): { content: LeksoplegmaResyncContent; report: ResyncReport } {
  const addedNorm = [...new Set(added.map(normalizeLetters))];
  const removedNorm = new Set(removed.map(normalizeLetters));

  const changed: ResyncChange[] = [];
  const warnings: string[] = [];

  const next = puzzles.map((puzzle) => {
    const required = new Set(Object.keys(puzzle.paths).map(normalizeLetters));

    // Curated geometry: refuse to auto-fix, name the board, move on.
    for (const word of removedNorm) {
      if (required.has(word)) {
        warnings.push(
          `${puzzle.id}: required word "${word}" was removed from the dictionary — ` +
            `its grid geometry is now invalid. Regenerate this board ` +
            `(npm run generate-leksoplegma); paths left untouched.`,
        );
      }
    }

    const current = puzzle.bonusWords;
    const present = new Set(current.map(normalizeLetters));

    const removedHere: string[] = [];
    const addedHere: string[] = [];

    // Removals: drop any listed bonus word that left the dictionary.
    let kept = current;
    if (removedNorm.size > 0) {
      kept = current.filter((w) => {
        const norm = normalizeLetters(w);
        if (removedNorm.has(norm)) {
          removedHere.push(norm);
          return false;
        }
        return true;
      });
    }

    // Additions: append newly-valid words this board can trace. The edge web
    // depends only on the board, so build it once rather than per candidate.
    const edges = addedNorm.length > 0 ? edgesOf(puzzle.paths) : new Set<string>();
    for (const word of addedNorm) {
      if (removedNorm.has(word)) continue; // removal wins
      if (present.has(word)) continue; // already listed
      if (boardAcceptsBonus(puzzle, word, required, edges)) {
        kept = kept === current ? [...current] : kept;
        kept.push(word);
        addedHere.push(word);
      }
    }

    if (removedHere.length === 0 && addedHere.length === 0) {
      return puzzle; // untouched — preserve identity so the writer can skip it
    }

    changed.push({ id: puzzle.id, added: addedHere, removed: removedHere });
    return { ...puzzle, bonusWords: kept };
  });

  return { content: next, report: { changed, warnings } };
}

export const leksoplegmaAdapter: ResyncAdapter<LeksoplegmaResyncContent> = {
  id: "leksoplegma",
  load: () => JSON.parse(readFileSync(puzzlesPath, "utf8")) as LeksoplegmaResyncContent,
  resync,
  // Compact JSON — match generate-leksoplegma.ts exactly, or the whole file diffs.
  files: (puzzles) => [{ path: puzzlesPath, contents: JSON.stringify(puzzles) }],
};
