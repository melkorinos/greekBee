"use client";

// On-screen Greek keyboard for Vres Tin Frasi.
// Four-state colouring: correct (green), present (yellow), misplaced-word (purple), absent (grey).
// Also has a clear-word button instead of the length switcher.

import type { PhraseLetterStateMap } from "@/games/vrestifrasi/types";

interface KeyboardProps {
  letterStates: PhraseLetterStateMap;
  onLetter:     (l: string) => void;
  onDelete:     () => void;
  onEnter:      () => void;
  disabled?:    boolean;
}

const ROWS = [
  ["ε", "ρ", "τ", "υ", "θ", "ι", "ο", "π"],
  ["α", "σ", "δ", "φ", "γ", "η", "ξ", "κ", "λ"],
  ["ζ", "χ", "ψ", "ω", "β", "ν", "μ"],
];

const STATE_CLASSES: Record<string, string> = {
  correct:          "bg-green-600  text-white border-green-600",
  present:          "bg-yellow-500 text-white border-yellow-500",
  "misplaced-word": "bg-purple-600 text-white border-purple-600",
  absent:           "bg-stone-500  text-white border-stone-500",
  unknown:          "bg-stone-200 text-stone-800 border-stone-200 dark:bg-stone-700 dark:text-stone-100 dark:border-stone-700",
};

export function Keyboard({
  letterStates,
  onLetter,
  onDelete,
  onEnter,
  disabled = false,
}: KeyboardProps) {
  const keyClass = (letter: string) => {
    const state = letterStates[letter] ?? "unknown";
    return [
      "flex items-center justify-center",
      "h-14 flex-1 min-w-0 px-1 rounded border",
      "text-base font-semibold uppercase cursor-pointer",
      "select-none transition-colors duration-150",
      "active:opacity-70",
      disabled ? "opacity-50 pointer-events-none" : "",
      STATE_CLASSES[state],
    ].join(" ");
  };

  const actionBase = [
    "flex items-center justify-center",
    "h-14 rounded border",
    "font-semibold cursor-pointer select-none",
    "active:opacity-70 transition-colors",
    disabled ? "opacity-50 pointer-events-none" : "",
  ].join(" ");

  const enterClass  = `${actionBase} flex-1 min-w-0 px-1 text-base bg-emerald-600 border-emerald-500 text-white`;
  const deleteClass = `${actionBase} flex-1 min-w-0 px-1 text-sm  bg-stone-300  border-stone-200   text-stone-700 dark:bg-stone-700 dark:border-stone-700 dark:text-stone-300`;

  return (
    <div className="flex flex-col items-center gap-1.5 w-full" aria-label="Keyboard">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1 w-full">
          {ri === ROWS.length - 1 && (
            <button
              className={enterClass}
              onClick={onEnter}
              aria-label="Submit guess"
              data-testid="btn-enter"
            >
              ↵
            </button>
          )}
          {row.map((letter) => (
            <button
              key={letter}
              className={keyClass(letter)}
              onClick={() => onLetter(letter)}
              aria-label={`Letter ${letter.toUpperCase()}`}
              data-testid={`key-${letter}`}
            >
              {letter.toUpperCase()}
            </button>
          ))}
          {ri === ROWS.length - 1 && (
            <button
              className={deleteClass}
              onClick={onDelete}
              aria-label="Delete letter"
              data-testid="btn-delete"
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
