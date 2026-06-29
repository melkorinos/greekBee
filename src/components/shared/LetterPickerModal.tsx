"use client";

// LetterPickerModal — shared modal for picking a set of Greek letters.
//
// Currently used by the Leksokipos "New Puzzle" flow.  Designed to be
// reusable by other games (e.g. Leksiarxeio custom-word sharer) via props.
//
// UX rules (Leksokipos mode):
//  - The FIRST letter tapped becomes the center (mandatory) letter — shown in yellow.
//  - The next 6 taps fill the outer ring — shown in dark.
//  - Tapping a selected outer letter deselects it.
//  - The center letter is LOCKED once chosen.  Press Reset to start over.
//  - "Random" fills all 7 slots at once; same lock/deselect rules apply after.
//    Random always picks a vowel as center, ensures ≥ 2 vowels total, and ensures ≥ 2 consonants in the outer ring.
//  - "Generate" is only active when all 7 slots are filled.

import { useCallback, useState } from "react";

import { Modal } from "./Modal";
import { pickRandom7 } from "@/games/leksokipos/lib/randomPuzzle";

// ── Letter layout ─────────────────────────────────────────────────────────────
// Same three rows as the Leksiarxeio on-screen keyboard so the layout is familiar.

const KEYBOARD_ROWS = [
  ["ε", "ρ", "τ", "υ", "θ", "ι", "ο", "π"],
  ["α", "σ", "δ", "φ", "γ", "η", "ξ", "κ", "λ"],
  ["ζ", "χ", "ψ", "ω", "β", "ν", "μ"],
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LetterPickerModalProps {
  isOpen: boolean;
  /** Called when the modal is dismissed without confirming. */
  onClose: () => void;
  /**
   * Called when the player presses Generate with all 7 letters chosen.
   * `center` is the mandatory center letter; `outer` is the 6 outer letters
   * (in selection order).
   */
  onConfirm: (center: string, outer: string[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LetterPickerModal({
  isOpen,
  onClose,
  onConfirm,
}: LetterPickerModalProps) {
  const [center, setCenter] = useState<string | null>(null);
  const [outer, setOuter] = useState<string[]>([]);

  const reset = useCallback(() => {
    setCenter(null);
    setOuter([]);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleRandom = useCallback(() => {
    const { center: c, outer: o } = pickRandom7();
    setCenter(c);
    setOuter(o);
  }, []);

  const handleLetterClick = useCallback(
    (letter: string) => {
      if (letter === center) return; // center is locked — Reset to change it

      if (outer.includes(letter)) {
        // Deselect outer letter
        setOuter((prev) => prev.filter((l) => l !== letter));
        return;
      }

      const selectedCount = (center ? 1 : 0) + outer.length;
      if (selectedCount >= 7) return; // all slots filled

      if (center === null) {
        setCenter(letter); // first pick = center
      } else {
        setOuter((prev) => [...prev, letter]);
      }
    },
    [center, outer],
  );

  const selectedCount = (center ? 1 : 0) + outer.length;
  const canGenerate = center !== null && outer.length === 6;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeLabel="Close"
      backdropTestId="letter-picker-backdrop"
      cardTestId="letter-picker-modal"
      closeTestId="letter-picker-close"
    >
        <h2 className="text-lg font-bold text-foreground mb-1">Επιλογή Γραμμάτων</h2>

        {/* Instructions */}
        <p className="text-xs text-muted mb-1 leading-relaxed">
          Επίλεξε <strong>7 γράμματα</strong>. Το πρώτο που θα πατήσεις γίνεται το{" "}
          <span className="text-yellow-600 font-semibold">κεντρικό (υποχρεωτικό)</span> γράμμα.
          Για να το αλλάξεις χρησιμοποίησε <strong>Επαναφορά</strong>.
        </p>

        {/* Progress */}
        <p className="text-xs text-muted mb-4 text-center" data-testid="letter-picker-count">
          {selectedCount} / 7 γράμματα επιλεγμένα
        </p>

        {/* Letter tiles — keyboard layout */}
        <div className="flex flex-col items-center gap-1.5 mb-5" data-testid="letter-picker-grid">
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1.5">
              {row.map((letter) => {
                const isCenter = letter === center;
                const isOuter  = outer.includes(letter);
                const isFull   = selectedCount >= 7 && !isCenter && !isOuter;

                return (
                  <button
                    key={letter}
                    onClick={() => handleLetterClick(letter)}
                    disabled={isFull}
                    aria-pressed={isCenter || isOuter}
                    aria-label={`${letter.toUpperCase()}${isCenter ? " (κεντρικό)" : ""}`}
                    data-testid={`letter-tile-${letter}`}
                    className={[
                      "w-9 h-9 rounded-lg border text-sm font-bold uppercase transition-colors select-none",
                      isCenter
                        ? "bg-yellow-400 border-yellow-400 text-white cursor-default"
                        : isOuter
                        ? "bg-inverted border-inverted text-inverted-foreground hover:opacity-90"
                        : isFull
                        ? "bg-surface-raised border-border text-muted cursor-not-allowed"
                        : "bg-border border-border text-foreground hover:opacity-80",
                    ].join(" ")}
                  >
                    {letter.toUpperCase()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={reset}
            data-testid="letter-picker-reset"
            className="flex-1 py-2 rounded-xl border border-border text-muted text-sm font-medium hover:bg-surface-raised active:bg-stone-100 transition-colors"
          >
            Επαναφορά
          </button>
          <button
            onClick={handleRandom}
            data-testid="letter-picker-random"
            className="flex-1 py-2 rounded-xl border border-border text-muted text-sm font-medium hover:bg-surface-raised active:bg-stone-100 transition-colors"
          >
            🎲 Τυχαίο
          </button>
          <button
            onClick={() => {
              if (canGenerate) {
                const confirmedCenter = center!;
                const confirmedOuter  = [...outer];
                reset();
                onConfirm(confirmedCenter, confirmedOuter);
              }
            }}
            disabled={!canGenerate}
            data-testid="letter-picker-generate"
            className={[
              "flex-1 py-2 rounded-xl text-sm font-bold border transition-colors",
              canGenerate
                ? "bg-yellow-400 border-yellow-400 text-white hover:bg-yellow-500 active:bg-yellow-600"
                : "bg-surface-raised border-border text-muted cursor-not-allowed",
            ].join(" ")}
          >
            Δημιουργία
          </button>
        </div>
    </Modal>
  );
}
