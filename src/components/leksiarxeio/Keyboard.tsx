"use client";

// On-screen Greek keyboard for Leksiarxeio.
// Layout mirrors a standard Greek soft keyboard, adapted for Leksiarxeio.

import { DeleteMark, SubmitMark } from "@/components/shared/KeyMarks";
import type { LetterStateMap } from "@/games/leksiarxeio/types";

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
  correct: "bg-correct text-white border-correct",
  present: "bg-present text-white border-present",
  absent:  "bg-key-absent text-white border-key-absent",
  unknown: "bg-key-idle   text-foreground border-key-idle",
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

  // Enter/Delete carry the SAME neutral fill an untouched letter key has
  // (`unknown` above). Enter used to be bg-correct, which put the game's "this
  // letter is in the right place" green on a key that is not a letter and reports
  // nothing — the feedback colours have to stay reserved for feedback. Both keys
  // are told apart by their drawn mark instead of by colour.
  const actionBase = [
    "flex items-center justify-center",
    "h-14 flex-1 min-w-0 rounded border",
    "font-semibold cursor-pointer select-none",
    "active:opacity-70 transition-colors",
    disabled ? "opacity-50 pointer-events-none" : "",
    STATE_CLASSES.unknown,
  ].join(" ");

  const enterClass  = `${actionBase} px-1`;
  const deleteClass = `${actionBase} px-1`;

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
              <SubmitMark />
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
              <DeleteMark />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
