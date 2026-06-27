"use client";

// FoundWordsList — scrollable list of all words the player has found.
// Pangrams are highlighted in yellow since they're a special achievement.
// The give-up button sits below the word list and opens the GiveUpModal
// (confirmation + missed words) — no inline confirmation here.

import { btnGiveUp, foundWordClass, foundWordPangramClass } from "@/styles/recipes";

import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { isPangram } from "@/games/leksokipos/lib/pangram";
import { useMemo } from "react";

interface FoundWordsListProps {
  words: string[];
  puzzle: LeksokiposPuzzle;
  /** Called when the player clicks give-up. Omit to hide the button. */
  onGiveUp?: () => void;
  /** When true the give-up button is hidden (game already ended). */
  givenUp?: boolean;
}

const styles = {
  container:  "w-full space-y-2",
  headingRow: "flex items-center justify-between",
  heading:    "text-sm font-semibold text-muted tracking-wide",
  count:      "text-foreground font-bold",
  empty:      "text-sm text-muted italic",
  list:       "flex flex-wrap gap-2 max-h-40 overflow-y-auto",
  giveUpRow:  "flex justify-end pt-1",
};

export function FoundWordsList({ words, puzzle, onGiveUp, givenUp }: FoundWordsListProps) {
  const sorted = useMemo(() => [...words].sort(), [words]);

  const showGiveUpButton = !!onGiveUp && !givenUp;

  return (
    <div data-testid="found-words-list" className={styles.container}>
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>
          Λέξεις που βρήκες:{" "}
          <span data-testid="found-words-count" className={styles.count}>{words.length}</span>
        </h2>
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>Καμία ακόμα — αρχίσε να γράφεις!</p>
      ) : (
        <ul className={styles.list}>
          {sorted.map((word) => (
            <li key={word}>
              <span
                data-testid={isPangram(word, puzzle) ? "found-word-pangram" : "found-word"}
                className={isPangram(word, puzzle) ? foundWordPangramClass : foundWordClass}
              >
                {word}
              </span>
            </li>
          ))}
        </ul>
      )}

      {showGiveUpButton && (
        <div className={styles.giveUpRow}>
          <button
            data-testid="btn-give-up"
            onClick={onGiveUp}
            className={btnGiveUp}
          >
            Παραίτηση
          </button>
        </div>
      )}
    </div>
  );
}
