"use client";

// FoundWordsList — scrollable list of all words the player has found.
// Pangrams are highlighted in yellow since they're a special achievement.
// Optionally shows a "Παραίτηση" give-up button right-aligned in the heading row.
// Each word has a flag icon so the player can nominate it for removal at any time.

import { btnGiveUp, foundWordClass, foundWordPangramClass } from "./styles";

import { NominationModal } from "@/components/shared/NominationModal";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { isPangram } from "@/games/leksokipos/lib/pangram";
import { getReportedWords, markReported } from "@/hooks/suggestions";
import { useMemo, useState } from "react";

interface FoundWordsListProps {
  words: string[];
  puzzle: LeksokiposPuzzle;
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
  wordRow:     "flex items-center gap-1",
  flagActive:  "text-red-400 text-xs leading-none hover:text-red-600 transition-colors",
  flagIdle:    "text-stone-300 text-xs leading-none hover:text-red-400 transition-colors",
};

export function FoundWordsList({ words, puzzle, onGiveUp, givenUp }: FoundWordsListProps) {
  const sorted = useMemo(() => [...words].sort(), [words]);

  const [confirming, setConfirming] = useState(false);
  const [reportWord, setReportWord] = useState<string | null>(null);
  // Mirror of the localStorage reported set so flag icons update without a page reload.
  const [reported, setReported] = useState<Set<string>>(() =>
    new Set(getReportedWords()),
  );

  function handleFlagClick(word: string) {
    if (!reported.has(word)) setReportWord(word);
  }

  function handleReportSuccess(word: string) {
    markReported(word);
    setReported((prev) => new Set([...prev, word]));
    setReportWord(null);
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
            onClick={() => setConfirming(true)}
            className={btnGiveUp}
          >
            Παραίτηση
          </button>
        )}
      </div>

      {showGiveUpButton && confirming && (
        <div className={styles.confirmRow}>
          <span className={styles.confirmText}>Είσαι σίγουρος/η;</span>
          <button
            data-testid="btn-give-up-confirm"
            onClick={() => { setConfirming(false); onGiveUp?.(); }}
            className={styles.confirmYes}
          >
            Ναι, παραιτούμαι
          </button>
          <button
            data-testid="btn-give-up-cancel"
            onClick={() => setConfirming(false)}
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
              className={styles.wordRow}
            >
              <span
                data-testid={isPangram(word, puzzle) ? "found-word-pangram" : "found-word"}
                className={isPangram(word, puzzle) ? foundWordPangramClass : foundWordClass}
              >
                {word}
              </span>
              <button
                onClick={() => handleFlagClick(word)}
                aria-label={`Αναφορά λέξης ${word}`}
                data-testid="flag-found-word"
                className={reported.has(word) ? styles.flagActive : styles.flagIdle}
                title={reported.has(word) ? "Έχεις ήδη αναφέρει αυτή τη λέξη" : "Αναφορά λέξης"}
              >
                ⚑
              </button>
            </li>
          ))}
        </ul>
      )}

      <NominationModal
        word={reportWord ?? ""}
        direction="remove"
        isOpen={reportWord !== null}
        onClose={() => setReportWord(null)}
        onSuccess={handleReportSuccess}
      />
    </div>
  );
}
