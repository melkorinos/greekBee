"use client";

// MissedWordsList — shown after the player gives up.
// Displays every valid word they failed to find, sorted alphabetically.
// Pangrams are highlighted in gold, consistent with FoundWordsList.

import { foundWordClass, foundWordPangramClass } from "./styles";

import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { isPangram } from "@/games/leksokipos/lib/pangram";
import { useMemo } from "react";

interface MissedWordsListProps {
  puzzle: LeksokiposPuzzle;
  foundWords: string[];
}

const styles = {
  container: "w-full space-y-2",
  heading:   "text-sm font-semibold text-stone-500 tracking-wide",
  count:     "text-stone-800 font-bold",
  empty:     "text-sm text-stone-400 italic",
  list:      "flex flex-wrap gap-2 max-h-48 overflow-y-auto",
};

export function MissedWordsList({ puzzle, foundWords }: MissedWordsListProps) {
  const missed = useMemo(() => {
    const foundSet = new Set(foundWords);
    return puzzle.validWords.filter((w) => !foundSet.has(w)).sort();
  }, [puzzle.validWords, foundWords]);

  return (
    <div data-testid="missed-words-list" className={styles.container}>
      <h2 className={styles.heading}>
        Λέξεις που έχασες:{" "}
        <span data-testid="missed-words-count" className={styles.count}>{missed.length}</span>
      </h2>

      {missed.length === 0 ? (
        <p className={styles.empty}>Βρήκες τα πάντα — τέλεια!</p>
      ) : (
        <ul className={styles.list}>
          {missed.map((word) => (
            <li
              key={word}
              data-testid={isPangram(word, puzzle) ? "missed-word-pangram" : "missed-word"}
              className={isPangram(word, puzzle) ? foundWordPangramClass : foundWordClass}
            >
              {word}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
