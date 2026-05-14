"use client";

// LetterPickerModal — shared modal for picking a set of Greek letters.
//
// Currently used by the Spelling Bee "New Puzzle" flow.  Designed to be
// reusable by other games (e.g. Wordle custom-word sharer) via props.
//
// UX rules (Spelling Bee mode):
//  - The FIRST letter tapped becomes the center (mandatory) letter — shown in yellow.
//  - The next 6 taps fill the outer ring — shown in dark.
//  - Tapping a selected outer letter deselects it.
//  - The center letter is LOCKED once chosen.  Press Reset to start over.
//  - "Random" fills all 7 slots at once; same lock/deselect rules apply after.
//    Random always picks a vowel as center, ensures ≥ 2 vowels total, and ensures ≥ 2 consonants in the outer ring.
//  - "Generate" is only active when all 7 slots are filled.

import { useCallback, useState } from "react";

// ── Letter layout ─────────────────────────────────────────────────────────────
// Same three rows as the Wordle on-screen keyboard so the layout is familiar.

const KEYBOARD_ROWS = [
  ["ε", "ρ", "τ", "υ", "θ", "ι", "ο", "π"],
  ["α", "σ", "δ", "φ", "γ", "η", "ξ", "κ", "λ"],
  ["ζ", "χ", "ψ", "ω", "β", "ν", "μ"],
];

const ALL_LETTERS = KEYBOARD_ROWS.flat(); // 24 letters

// Greek vowels — used to enforce puzzle quality in random selection.
const VOWELS = new Set(["α", "ε", "η", "ι", "ο", "υ", "ω"]);
const CONSONANTS = ALL_LETTERS.filter((l) => !VOWELS.has(l));

/**
 * Pick 7 unique random Greek letters that meet minimum quality rules:
 *   - Center letter is always a vowel (mandatory center = more valid words).
 *   - At least 1 additional vowel among the 6 outer letters (≥ 2 vowels total).
 *   - At least 2 consonants among the 6 outer letters — avoids all-vowel grids.
 *
 * Implementation: pick center from vowels, guarantee 1 extra vowel + 2 consonants
 * in outer, fill remaining 3 slots randomly, then shuffle the outer ring.
 */
function pickRandom7(): { center: string; outer: string[] } {
  // Shuffle helper
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 1. Pick center from vowels
  const shuffledVowels = shuffle([...VOWELS]);
  const center = shuffledVowels[0];

  // 2. Remaining letters (all letters except center)
  const remaining = ALL_LETTERS.filter((l) => l !== center);
  const remainingVowels     = remaining.filter((l) =>  VOWELS.has(l));
  const remainingConsonants = remaining.filter((l) => !VOWELS.has(l));

  // 3. Guarantee at least 1 more vowel and at least 2 consonants in the outer ring
  const [extraVowel, ...restVowels]         = shuffle(remainingVowels);
  const [cons1, cons2, ...restConsonants]   = shuffle(remainingConsonants);

  // 4. Fill the remaining 3 outer slots from the leftover pool
  const pool   = shuffle([...restVowels, ...restConsonants]);
  const filler = pool.slice(0, 3);

  // 5. Shuffle the outer ring so the guaranteed letters aren't always in the same slots
  const outer = shuffle([extraVowel, cons1, cons2, ...filler]);

  return { center, outer };
}

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={handleClose}
      data-testid="letter-picker-backdrop"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
        data-testid="letter-picker-modal"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-xl leading-none"
          data-testid="letter-picker-close"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold text-stone-800 mb-1">Επιλογή Γραμμάτων</h2>

        {/* Instructions */}
        <p className="text-xs text-stone-500 mb-1 leading-relaxed">
          Επίλεξε <strong>7 γράμματα</strong>. Το πρώτο που θα πατήσεις γίνεται το{" "}
          <span className="text-yellow-600 font-semibold">κεντρικό (υποχρεωτικό)</span> γράμμα.
          Για να το αλλάξεις χρησιμοποίησε <strong>Επαναφορά</strong>.
        </p>

        {/* Progress */}
        <p className="text-xs text-stone-400 mb-4 text-center" data-testid="letter-picker-count">
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
                        ? "bg-stone-700 border-stone-700 text-white hover:bg-stone-600 active:bg-stone-500"
                        : isFull
                        ? "bg-stone-100 border-stone-200 text-stone-300 cursor-not-allowed"
                        : "bg-stone-200 border-stone-300 text-stone-700 hover:bg-stone-300 active:bg-stone-400",
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
            className="flex-1 py-2 rounded-xl border border-stone-300 text-stone-600 text-sm font-medium hover:bg-stone-50 active:bg-stone-100 transition-colors"
          >
            Επαναφορά
          </button>
          <button
            onClick={handleRandom}
            data-testid="letter-picker-random"
            className="flex-1 py-2 rounded-xl border border-stone-300 text-stone-600 text-sm font-medium hover:bg-stone-50 active:bg-stone-100 transition-colors"
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
                : "bg-stone-100 border-stone-200 text-stone-300 cursor-not-allowed",
            ].join(" ")}
          >
            Δημιουργία
          </button>
        </div>
      </div>
    </div>
  );
}
