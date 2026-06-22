// resync-puzzles.mjs — pure helpers that keep the embedded `validWords` of the
// pre-built Leksokipos puzzles (puzzles-el.json) in sync with dictionary edits.
//
// Background: every Pre-built Puzzle stores its own pre-computed `validWords`
// array. When a word is added to or removed from words-el.json (via an accepted
// Leksikastirio Nomination), those embedded arrays go stale:
//   - a removed word stays scoreable in every puzzle that listed it (a bug);
//   - an added word never becomes scoreable in puzzles whose 7 letters cover it.
//
// A word's validity for a given puzzle is fully self-contained (does the
// puzzle's letter set cover it, and does it contain the centre letter?), so we
// patch surgically — no dictionary scan, original word order preserved, minimal
// git diff. The predicate mirrors src/games/leksokipos/lib/computeValidWords.ts.
//
// Pure: no I/O, no Supabase, no side-effects. Fully unit-testable.

/**
 * Mirror of src/games/leksokipos/lib/normalize.ts normalizeLetters():
 * lowercase, strip diacritics, final sigma ς → σ.
 */
export function normalise(word) {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ς/g, "σ");
}

/**
 * Returns true when `normWord` (already normalised) is a valid answer for the
 * given puzzle: ≥4 letters, contains the centre letter, every character is in
 * the puzzle's letter set. Same rule as computeValidWords().
 */
export function puzzleAcceptsWord(puzzle, normWord) {
  const center = normalise(puzzle.centerLetter);
  const allowed = new Set([center, ...puzzle.outerLetters.map(normalise)]);
  return (
    normWord.length >= 4 &&
    normWord.includes(center) &&
    [...normWord].every((ch) => allowed.has(ch))
  );
}

/**
 * Re-syncs every puzzle's `validWords` against a batch of dictionary edits.
 *
 * @param {Array<{centerLetter:string, outerLetters:string[], validWords:string[]}>} puzzles
 * @param {{ added?: string[], removed?: string[] }} edits  words already applied to words-el.json
 * @returns {{ puzzles: typeof puzzles, changed: Array<{ id?: string, added: string[], removed: string[] }> }}
 *
 * Removals win over additions when the same word appears in both lists.
 * Only puzzles whose `validWords` actually change are new objects; the rest are
 * returned untouched (referential identity preserved) so the writer can skip them.
 */
export function resyncPuzzles(puzzles, { added = [], removed = [] } = {}) {
  const addedNorm = [...new Set(added.map(normalise))];
  const removedNorm = new Set(removed.map(normalise));

  const changed = [];

  const next = puzzles.map((puzzle) => {
    const current = puzzle.validWords;
    const present = new Set(current.map(normalise));

    const removedHere = [];
    const addedHere = [];

    // Removals: drop any listed word that was deleted from the dictionary.
    let kept = current;
    if (removedNorm.size > 0) {
      kept = current.filter((w) => {
        const n = normalise(w);
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

  return { puzzles: next, changed };
}
