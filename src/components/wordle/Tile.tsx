"use client";

// A single Wordle letter tile.

import type { TileState } from "@/games/wordle/types";

interface TileProps {
  letter?: string;
  state:   TileState;
  /** Animate the tile flip in (after guess submission) */
  animate?: boolean;
}

const STATE_CLASSES: Record<TileState, string> = {
  correct: "bg-green-600  border-green-600  text-white",
  present: "bg-yellow-500 border-yellow-500 text-white",
  absent:  "bg-stone-600  border-stone-600  text-white",
  empty:   "bg-transparent border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100",
  pending: "bg-transparent border-stone-500 text-stone-900 dark:text-stone-100",
};

export function Tile({ letter = "", state, animate = false }: TileProps) {
  return (
    <div
      className={[
        "flex items-center justify-center",
        "w-14 h-14 border-2 rounded",
        "text-2xl font-bold uppercase select-none",
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
