"use client";

// FoundWordsList — scrollable list of all words the player has found.
// Pangrams are highlighted in yellow since they're a special achievement.

import { foundWordClass, foundWordPangramClass } from "./styles";

import type { Puzzle } from "@/games/spelling-bee/types";
import { isPangram } from "@/games/spelling-bee/lib/pangram";
import { useMemo } from "react";

interface FoundWordsListProps {
  words: string[];
  puzzle: Puzzle;
}

const styles = {
  container: "w-full space-y-2",
  heading:   "text-sm font-semibold text-stone-500 tracking-wide",
  count:     "text-stone-800 font-bold",
  empty:     "text-sm text-stone-400 italic",
  list:      "flex flex-wrap gap-2 max-h-40 overflow-y-auto",
};

export function FoundWordsList({ words, puzzle }: FoundWordsListProps) {
  // Sort alphabetically for easy scanning — memoised to avoid re-sorting on every
  // ADD_LETTER render (GameBoard re-renders on each keystroke).
  const sorted = useMemo(() => [...words].sort(), [words]);

  return (
    <div data-testid="found-words-list" className={styles.container}>
      <h2 className={styles.heading}>
        Λέξεις που βρήκες:{" "}
        <span data-testid="found-words-count" className={styles.count}>{words.length}</span>
      </h2>

      {sorted.length === 0 ? (
        <p className={styles.empty}>Καμία ακόμα — αρχίσε να γράφεις!</p>
      ) : (
        <ul className={styles.list}>
          {sorted.map((word) => (
            <li
              key={word}
              data-testid={isPangram(word, puzzle) ? "found-word-pangram" : "found-word"}
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
