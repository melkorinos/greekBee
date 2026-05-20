"use client";

// On-screen Greek keyboard for Wordle GR.
// Layout mirrors a standard Greek soft keyboard, adapted for Wordle.

import type { LetterStateMap } from "@/games/wordle/types";

interface KeyboardProps {
  letterStates: LetterStateMap;
  onLetter:     (l: string) => void;
  onDelete:     () => void;
  onEnter:      () => void;
  disabled?:    boolean;
}

// Greek keyboard rows (normalised — no accents, ς → σ handled by normalisation)
const ROWS = [
  ["ε", "ρ", "τ", "υ", "θ", "ι", "ο", "π"],
  ["α", "σ", "δ", "φ", "γ", "η", "ξ", "κ", "λ"],
  ["ζ", "χ", "ψ", "ω", "β", "ν", "μ"],
];

const STATE_CLASSES: Record<string, string> = {
  correct: "bg-green-600  text-white border-green-600",
  present: "bg-yellow-500 text-white border-yellow-500",
  absent:  "bg-stone-500  text-white border-stone-500",
  unknown: "bg-stone-700  text-stone-100 border-stone-600",
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

  // Enter/Delete share a base class; Enter gets an accent colour to stand out.
  const actionBase = [
    "flex items-center justify-center",
    "h-14 flex-1 min-w-0 rounded border",
    "font-semibold cursor-pointer select-none",
    "active:opacity-70 transition-colors",
    disabled ? "opacity-50 pointer-events-none" : "",
  ].join(" ");

  const enterClass  = `${actionBase} px-1 text-base bg-emerald-600 border-emerald-500 text-white`;
  const deleteClass = `${actionBase} px-1 text-sm  bg-stone-600  border-stone-500  text-stone-100`;

  return (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-sm px-2" aria-label="Keyboard">
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
