"use client";

// A single Vres Tin Frasi letter tile.
// Four evaluated states: correct (green), present (yellow),
// misplaced-word (purple), absent (grey).

import type { PhraseTileState } from "@/games/vrestifrasi/types";

interface TileProps {
  letter?:   string;
  state:     PhraseTileState;
  animate?:  boolean;
  /** Sizing is owned by PhraseGrid, which does the line-fitting maths. */
  sizeClass: string;
  textClass: string;
}

const STATE_CLASSES: Record<PhraseTileState, string> = {
  correct:        "bg-correct  border-correct  text-white",
  present:        "bg-present  border-present  text-white",
  "misplaced-word": "bg-misplaced border-misplaced text-white",
  absent:         "bg-absent   border-absent   text-white",
  empty:          "bg-transparent border-border text-foreground",
  pending:        "bg-transparent border-muted  text-foreground",
};

export function Tile({
  letter  = "",
  state,
  animate = false,
  sizeClass,
  textClass,
}: TileProps) {
  return (
    <div
      className={[
        "flex items-center justify-center",
        sizeClass,
        // 1px border, not 2 — every pixel of border is a pixel the letter loses.
        "border rounded",
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
