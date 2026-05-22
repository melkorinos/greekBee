"use client";

// FoundWordsList — scrollable list of all words the player has found.
// Pangrams are highlighted in yellow since they're a special achievement.
// Optionally shows a "Παραίτηση" give-up button right-aligned in the heading row.

import { btnGiveUp, foundWordClass, foundWordPangramClass } from "./styles";

import type { SpellingBeePuzzle } from "@/games/spelling-bee/types";
import { isPangram } from "@/games/spelling-bee/lib/pangram";
import { useMemo, useState } from "react";

interface FoundWordsListProps {
  words: string[];
  puzzle: SpellingBeePuzzle;
  /** Called when the player confirms they want to give up. Omit to hide the button. */
  onGiveUp?: () => void;
  /** When true the give-up button is hidden (game already ended). */
  givenUp?: boolean;
}

const styles = {
  container:   "w-full space-y-2",
  headingRow:  "flex items-center justify-between",
  heading:     "text-sm font-semibold text-stone-500 tracking-wide",
  count:       "text-stone-800 font-bold",
  empty:       "text-sm text-stone-400 italic",
  list:        "flex flex-wrap gap-2 max-h-40 overflow-y-auto",
  confirmRow:  "flex items-center gap-2 justify-end",
  confirmText: "text-xs text-stone-500",
  confirmYes:  "text-xs font-semibold text-red-600 border border-red-300 rounded-full px-3 py-1 hover:bg-red-50 active:bg-red-100 transition-colors",
  confirmNo:   "text-xs text-stone-500 border border-stone-200 rounded-full px-3 py-1 hover:bg-stone-100 transition-colors",
};

export function FoundWordsList({ words, puzzle, onGiveUp, givenUp }: FoundWordsListProps) {
  // Sort alphabetically for easy scanning — memoised to avoid re-sorting on every
  // ADD_LETTER render (GameBoard re-renders on each keystroke).
  const sorted = useMemo(() => [...words].sort(), [words]);

  // Inline confirmation state — avoids an extra modal for a simple destructive action
  const [confirming, setConfirming] = useState(false);

  function handleGiveUpClick() {
    setConfirming(true);
  }

  function handleConfirmYes() {
    setConfirming(false);
    onGiveUp?.();
  }

  function handleConfirmNo() {
    setConfirming(false);
  }

  const showGiveUpButton = !!onGiveUp && !givenUp;

  return (
    <div data-testid="found-words-list" className={styles.container}>
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>
          Λέξεις που βρήκες:{" "}
          <span data-testid="found-words-count" className={styles.count}>{words.length}</span>
        </h2>

        {showGiveUpButton && !confirming && (
          <button
            data-testid="btn-give-up"
            onClick={handleGiveUpClick}
            className={btnGiveUp}
          >
            Παραίτηση
          </button>
        )}
      </div>

      {/* Inline confirmation row — replaces the button until player decides */}
      {showGiveUpButton && confirming && (
        <div className={styles.confirmRow}>
          <span className={styles.confirmText}>Είσαι σίγουρος/η;</span>
          <button
            data-testid="btn-give-up-confirm"
            onClick={handleConfirmYes}
            className={styles.confirmYes}
          >
            Ναι, παραιτούμαι
          </button>
          <button
            data-testid="btn-give-up-cancel"
            onClick={handleConfirmNo}
            className={styles.confirmNo}
          >
            Άκυρο
          </button>
        </div>
      )}

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
