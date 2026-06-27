"use client";

// A single Leksiarxeio letter tile.

import type { TileState } from "@/games/leksiarxeio/types";

interface TileProps {
  letter?: string;
  state:   TileState;
  /** Animate the tile flip in (after guess submission) */
  animate?: boolean;
  /** Tailwind size classes, e.g. "w-14 h-14" — set by GuessGrid based on word length */
  sizeClass?: string;
  /** Tailwind text size class — set by GuessGrid based on word length */
  textClass?: string;
}

const STATE_CLASSES: Record<TileState, string> = {
  correct: "bg-correct  border-correct  text-white",
  present: "bg-present  border-present  text-white",
  absent:  "bg-absent   border-absent   text-white",
  empty:   "bg-transparent border-border text-foreground",
  pending: "bg-transparent border-muted  text-foreground",
};

export function Tile({
  letter = "",
  state,
  animate = false,
  sizeClass = "w-14 h-14",
  textClass = "text-2xl",
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
