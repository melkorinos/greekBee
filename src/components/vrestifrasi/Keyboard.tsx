"use client";

// On-screen Greek keyboard for Vres Tin Frasi.
// Four-state colouring: correct (green), present (yellow), misplaced-word (purple), absent (grey).
// Also has a clear-word button instead of the length switcher.

import { DeleteMark, SubmitMark } from "@/components/shared/KeyMarks";
import { keyStruck } from "@/styles/recipes";
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
  correct:          "bg-correct text-white border-correct",
  present:          "bg-present text-white border-present",
  "misplaced-word": "bg-misplaced text-white border-misplaced",
  absent:           "bg-absent  text-white border-absent",
  unknown:          "bg-border  text-foreground border-border",
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
      // "Out of play" is said with a shape, not with a second shade of grey —
      // the fills stay exactly as they are and the strike carries the meaning.
      state === "absent" ? keyStruck : "",
    ].join(" ");
  };

  // Enter/Delete carry the SAME neutral fill an untouched letter key has
  // (`unknown` above). Enter used to be bg-correct, which put the game's "this
  // letter is in the right place" green on a key that is not a letter and reports
  // nothing — the feedback colours have to stay reserved for feedback. Both keys
  // are told apart by their drawn mark instead of by colour.
  const actionBase = [
    "flex items-center justify-center",
    "h-14 rounded border",
    "font-semibold cursor-pointer select-none",
    "active:opacity-70 transition-colors",
    disabled ? "opacity-50 pointer-events-none" : "",
    STATE_CLASSES.unknown,
  ].join(" ");

  const enterClass  = `${actionBase} flex-1 min-w-0 px-1`;
  const deleteClass = `${actionBase} flex-1 min-w-0 px-1`;

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
              {/* Own stacking context, so the strike passes UNDER the glyph. */}
              <span className="relative z-10">{letter.toUpperCase()}</span>
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
