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
  /**
   * Tap handler for the word this tile belongs to. Present ONLY on the row being
   * typed — a played guess is history and must not look tappable. Supplying it
   * turns the tile into a real `<button>` so the jump is keyboard-reachable and
   * announced, rather than a div with a click listener bolted on.
   */
  onSelect?: () => void;
  /** This tile's word holds the cursor. Drawn as an outline, never a fill. */
  focused?:  boolean;
}

/**
 * Fill and text per state. Split from the border below because the CURSOR owns
 * the border of the word it sits on, and two competing `border-*` utilities in
 * one class string are ordered by Tailwind's own sort, not by the order they
 * appear here — so the cursor could win or lose at random. Choosing exactly one
 * border class settles it.
 */
const STATE_FILL: Record<PhraseTileState, string> = {
  correct:        "bg-correct  text-white",
  present:        "bg-present  text-white",
  "misplaced-word": "bg-misplaced text-white",
  absent:         "bg-absent   text-white",
  empty:          "bg-transparent text-foreground",
  pending:        "bg-transparent text-foreground",
};

const STATE_BORDER: Record<PhraseTileState, string> = {
  correct:        "border-correct",
  present:        "border-present",
  "misplaced-word": "border-misplaced",
  absent:         "border-absent",
  empty:          "border-tile-border",
  pending:        "border-muted",
};

export function Tile({
  letter  = "",
  state,
  animate = false,
  sizeClass,
  textClass,
  onSelect,
  focused = false,
}: TileProps) {
  const className = [
    "flex items-center justify-center",
    sizeClass,
    // 2px, matching every other letter box on the platform. This was 1px on
    // the grounds that a 32px tile cannot spare the pixels; legibility of the
    // *blank* grid turned out to be the tighter constraint, and 28px of
    // interior still clears the 16px letter comfortably.
    "border-2 rounded",
    textClass,
    "font-bold uppercase select-none",
    "transition-all duration-300",
    animate ? "animate-flip" : "",
    STATE_FILL[state],
    // The cursor DARKENS the word's own border rather than adding anything
    // around it. Not a fill and not the game accent: this board's accent is
    // purple, which already means "misplaced-word", so an accent would read as a
    // scored tile (ADR 0008 keeps the feedback colours for feedback). An outer
    // `ring` was tried first and rejected on the screen — at 32px, 2px of ring
    // immediately outside 2px of border reads as one slightly thicker border,
    // and the 4px inter-tile gap leaves it nowhere to sit.
    focused ? "border-foreground" : STATE_BORDER[state],
    onSelect ? "cursor-pointer" : "",
  ].join(" ");

  const ariaLabel = letter ? `${letter} ${state}` : "empty";

  // Non-interactive tiles stay plain divs — six rows of buttons would put 100+
  // stops in the tab order for a board where only one row is editable.
  if (!onSelect) {
    return (
      <div className={className} aria-label={ariaLabel}>
        {letter}
      </div>
    );
  }

  return (
    <button type="button" className={className} aria-label={ariaLabel} onClick={onSelect}>
      {letter}
    </button>
  );
}
