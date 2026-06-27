"use client";

// GiveUpModal — two-phase modal for the give-up flow.
// Phase 1 (!givenUp): confirmation prompt with Ναι / Άκυρο.
// Phase 2  (givenUp): shows missed words; player closes when done.
// The main page still renders MissedWordsList below the found words after close.

import { btnCancel } from "@/styles/recipes";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { MissedWordsList } from "./MissedWordsList";

interface GiveUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  givenUp: boolean;
  puzzle: LeksokiposPuzzle;
  foundWords: string[];
}

const dangerConfirm =
  "flex-1 py-2 rounded-xl bg-danger text-white text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity";

export function GiveUpModal({
  isOpen,
  onClose,
  onConfirm,
  givenUp,
  puzzle,
  foundWords,
}: GiveUpModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Κλείσιμο"
          className="absolute top-4 right-4 text-muted hover:text-foreground text-xl leading-none"
        >
          ✕
        </button>

        {!givenUp ? (
          <>
            <h2 className="text-lg font-bold text-foreground mb-2">Παραίτηση;</h2>
            <p className="text-sm text-muted mb-6">
              Θα δεις όλες τις λέξεις που δεν βρήκες. Είσαι σίγουρος/η;
            </p>
            <div className="flex gap-3">
              <button
                data-testid="btn-give-up-cancel"
                onClick={onClose}
                className={btnCancel}
              >
                Άκυρο
              </button>
              <button
                data-testid="btn-give-up-confirm"
                onClick={onConfirm}
                className={dangerConfirm}
              >
                Ναι, παραιτούμαι
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-foreground mb-4">Λέξεις που έχασες</h2>
            <MissedWordsList puzzle={puzzle} foundWords={foundWords} />
            <button
              onClick={onClose}
              className="mt-4 w-full py-2 rounded-xl border border-border text-muted text-sm font-medium hover:bg-surface-raised active:bg-border transition-colors"
            >
              Κλείσιμο
            </button>
          </>
        )}
      </div>
    </div>
  );
}
