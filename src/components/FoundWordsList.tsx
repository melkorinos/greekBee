"use client";

// FoundWordsList — scrollable list of all words the player has found.
// Pangrams are highlighted in yellow since they're a special achievement.

import type { Puzzle } from "@/types";
import { isPangram } from "@/lib/pangram";

interface FoundWordsListProps {
  words: string[];
  puzzle: Puzzle;
}

// ── Class constants ──────────────────────────────────────────────────────────
const styles = {
  container:    "w-full space-y-2",
  heading:      "text-sm font-semibold text-stone-500 uppercase tracking-wide",
  count:        "text-stone-800 font-bold",
  empty:        "text-sm text-stone-400 italic",
  list:         "flex flex-wrap gap-2 max-h-40 overflow-y-auto",
  wordNormal:   "px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-sm uppercase",
  wordPangram:  "px-2 py-0.5 rounded bg-yellow-300 text-stone-800 text-sm font-semibold uppercase",
};

export function FoundWordsList({ words, puzzle }: FoundWordsListProps) {
  // Sort alphabetically for easy scanning
  const sorted = [...words].sort();

  return (
    <div data-testid="found-words-list" className={styles.container}>
      <h2 className={styles.heading}>
        Found words{" "}
        <span data-testid="found-words-count" className={styles.count}>{words.length}</span>
      </h2>

      {sorted.length === 0 ? (
        <p className={styles.empty}>None yet — start typing!</p>
      ) : (
        <ul className={styles.list}>
          {sorted.map((word) => (
            <li
              key={word}
              data-testid={isPangram(word, puzzle) ? "found-word-pangram" : "found-word"}
              className={isPangram(word, puzzle) ? styles.wordPangram : styles.wordNormal}
            >
              {word}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
