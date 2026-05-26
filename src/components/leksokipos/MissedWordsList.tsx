"use client";

// MissedWordsList — shown after the player gives up.
// Displays every valid word they failed to find, sorted alphabetically.
// Pangrams are highlighted in gold, consistent with FoundWordsList.
// Each word has a flag icon so the player can nominate it for removal.

import { foundWordClass, foundWordPangramClass } from "./styles";

import { NominationModal } from "@/components/shared/NominationModal";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { isPangram } from "@/games/leksokipos/lib/pangram";
import { getReportedWords, markReported } from "@/hooks/suggestions";
import { useMemo, useState } from "react";

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
  wordRow:   "flex items-center gap-1",
  flagActive: "text-red-400 text-xs leading-none hover:text-red-600 transition-colors",
  flagIdle:   "text-stone-300 text-xs leading-none hover:text-red-400 transition-colors",
};

export function MissedWordsList({ puzzle, foundWords }: MissedWordsListProps) {
  const missed = useMemo(() => {
    const foundSet = new Set(foundWords);
    return puzzle.validWords.filter((w) => !foundSet.has(w)).sort();
  }, [puzzle.validWords, foundWords]);

  const [reportWord, setReportWord] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(() =>
    new Set(getReportedWords()),
  );

  function handleReportSuccess(word: string) {
    markReported(word);
    setReported((prev) => new Set([...prev, word]));
    setReportWord(null);
  }

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
            <li key={word} className={styles.wordRow}>
              <span
                data-testid={isPangram(word, puzzle) ? "missed-word-pangram" : "missed-word"}
                className={isPangram(word, puzzle) ? foundWordPangramClass : foundWordClass}
              >
                {word}
              </span>
              <button
                onClick={() => { if (!reported.has(word)) setReportWord(word); }}
                aria-label={`Αναφορά λέξης ${word}`}
                data-testid="flag-missed-word"
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
