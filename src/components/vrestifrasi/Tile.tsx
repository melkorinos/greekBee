"use client";

// A single Vres Tin Frasi letter tile.
// Four evaluated states: correct (green), present (yellow),
// misplaced-word (purple), absent (grey).

import type { PhraseTileState } from "@/games/vrestifrasi/types";

interface TileProps {
  letter?:    string;
  state:      PhraseTileState;
  animate?:   boolean;
  sizeClass?: string;
  textClass?: string;
}

const STATE_CLASSES: Record<PhraseTileState, string> = {
  correct:        "bg-green-600  border-green-600  text-white",
  present:        "bg-yellow-500 border-yellow-500 text-white",
  "misplaced-word": "bg-purple-600 border-purple-600 text-white",
  absent:         "bg-stone-500  border-stone-500  text-white",
  empty:          "bg-transparent border-stone-300 text-stone-800 dark:border-stone-600 dark:text-stone-100",
  pending:        "bg-transparent border-stone-500 text-stone-800 dark:border-stone-400 dark:text-stone-100",
};

export function Tile({
  letter    = "",
  state,
  animate   = false,
  sizeClass = "w-12 h-12",
  textClass = "text-base",
}: TileProps) {
  return (
    <div
      className={[
        "flex items-center justify-center",
        sizeClass,
        "border-2 rounded",
        textClass,
        "font-bold uppercase select-none",
        "transition-all duration-300",
        animate ? "animate-flip" : "",
        STATE_CLASSES[state],
      ].join(" ")}
      aria-label={letter ? `${letter} ${state}` : "empty"}
    >
      {letter}
    </div>
  );
}
