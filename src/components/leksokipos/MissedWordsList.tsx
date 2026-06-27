"use client";

// MissedWordsList — shown after the player gives up.
// Displays every valid word they failed to find, sorted alphabetically.
// Pangrams are highlighted in gold, consistent with FoundWordsList.
// Each word is clickable to nominate it for removal.

import { foundWordClass, foundWordPangramClass } from "@/styles/recipes";

import { NominationModal } from "@/components/shared/NominationModal";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { isPangram } from "@/games/leksokipos/lib/pangram";
import { getReportedWords, markReported } from "@/hooks/suggestions";
import { useMemo, useState } from "react";

interface MissedWordsListProps {
  puzzle: LeksokiposPuzzle;
  foundWords: string[];
}

// Component-local layout + text recipes (token-based; no dark: pairs needed).
const styles = {
  container:    "w-full space-y-2",
  heading:      "text-sm font-semibold text-muted tracking-wide",
  count:        "text-foreground font-bold",
  empty:        "text-sm text-muted italic",
  list:         "flex flex-wrap gap-2 max-h-48 overflow-y-auto",
  wordReported: "opacity-50 cursor-default",
  wordReport:   "cursor-pointer hover:opacity-75 transition-opacity",
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
            <li key={word}>
              <span
                data-testid={isPangram(word, puzzle) ? "missed-word-pangram" : "missed-word"}
                className={[
                  isPangram(word, puzzle) ? foundWordPangramClass : foundWordClass,
                  reported.has(word) ? styles.wordReported : styles.wordReport,
                ].join(" ")}
                onClick={() => { if (!reported.has(word)) setReportWord(word); }}
                title={reported.has(word) ? "Έχεις ήδη αναφέρει αυτή τη λέξη" : "Κλικ για αναφορά λέξης"}
              >
                {word}
              </span>
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
