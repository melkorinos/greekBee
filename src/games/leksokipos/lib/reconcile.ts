// Snapshot reconciliation — the guard that makes a restored round match the
// board it is being restored onto.
//
// Both restore paths (localStorage via useRoundPersistence, server via
// pullSnapshot) key their saved round on the puzzle DATE, never on the letters.
// So when a corpus edit replaces the puzzle for a date that has already been
// played, the old round comes back on top of the new garden: words that are not
// in the new word list, a score computed against the old ceiling, and a rank
// that can already sit at the top. That is exactly what shipped to production
// during the 2026-07-30 prune.
//
// The fix is to trust only the found words, and only those the new puzzle
// actually accepts — everything else is recomputed here.

import type { LeksokiposPuzzle, LeksokiposRoundSnapshot } from "../types";
import { calculateRank } from "./ranking";
import { normalizeLetters } from "./normalize";
import { computeScoreFromWords, maxScore } from "./scoring";

/**
 * Builds a snapshot for `puzzle` from an arbitrary list of found words.
 *
 * Words the puzzle does not accept are dropped (normalised comparison, so final
 * sigma matches), and score plus rank are recomputed from what survives. Used
 * by both restore paths so a stale round can never inflate a score.
 */
export function buildSnapshotFromWords(
  words: string[],
  puzzle: LeksokiposPuzzle,
  rest: Pick<LeksokiposRoundSnapshot, "startedAt" | "givenUp">,
): LeksokiposRoundSnapshot {
  const validSet = new Set(puzzle.validWords.map(normalizeLetters));
  const foundWords = words.map(normalizeLetters).filter((w) => validSet.has(w));
  const score = computeScoreFromWords(foundWords, puzzle);

  return {
    foundWords,
    score,
    currentRank: calculateRank(score, maxScore(puzzle)),
    ...rest,
  };
}

/**
 * Reconciles a saved snapshot against the puzzle now being played.
 *
 * Returns the snapshot unchanged when every saved word still belongs to the
 * puzzle — the overwhelmingly common case, a same-day reload. When words do not
 * match, the round is rebuilt from the surviving words alone; `startedAt` and
 * `givenUp` are carried through either way.
 */
export function reconcileSnapshot(
  saved: LeksokiposRoundSnapshot,
  puzzle: LeksokiposPuzzle,
): LeksokiposRoundSnapshot {
  const rebuilt = buildSnapshotFromWords(saved.foundWords, puzzle, {
    startedAt: saved.startedAt,
    givenUp:   saved.givenUp,
  });

  // Same words in the same order means the saved round belongs to this puzzle;
  // hand back the original object so React sees no state change on reload.
  const unchanged =
    rebuilt.foundWords.length === saved.foundWords.length &&
    rebuilt.foundWords.every((w, i) => w === saved.foundWords[i]);

  return unchanged ? saved : rebuilt;
}
