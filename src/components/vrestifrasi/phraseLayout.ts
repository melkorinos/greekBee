// Line-fitting maths for the Vres Tin Frasi phrase grid.
//
// Tiles are a FIXED size for every phrase — legibility is the constraint, so the
// grid grows downwards instead of shrinking sideways when a phrase is long.
// Vertical space is free here: the keyboard is `sticky bottom-0` in
// VresTinFrasiBoard, so a tall grid scrolls underneath it and the keys never
// leave the viewport. Horizontal space is not free, hence the wrap.
//
// Pure module — no React — so the packing rule is testable on its own.
//
//   available = 368px (max-w-game 384px – px-2 16px)
//   tile      =  32px (w-8)
//   gap       =   4px (gap-1, between every adjacent flex child)
//   spacer    =   8px (w-2, between two words sharing a line)

export const AVAILABLE = 368;
export const TILE      = 32;
export const GAP       = 4;
export const SPACER    = 8;

/** Tailwind classes for a tile at TILE px. Kept next to the maths that assumes them. */
export const TILE_SIZE_CLASS = "w-8 h-8";
export const TILE_TEXT_CLASS = "text-base";

export interface LineRange {
  from: number;
  to:   number;
}

/** Rendered width of a line holding these words, in px. */
export function lineWidth(wordLengths: number[]): number {
  const tiles   = wordLengths.reduce((sum, len) => sum + len, 0);
  const spacers = Math.max(0, wordLengths.length - 1);
  if (tiles === 0) return 0;
  return tiles * TILE + spacers * SPACER + (tiles + spacers - 1) * GAP;
}

/**
 * Greedy word-wrap: fill a line with whole words until the next one no longer
 * fits at TILE px, then start a new line. Returns word-index ranges.
 *
 * A word is never broken across lines. It never has to be: gameRules
 * VRESTIFRASI caps a word at 8 letters, which is 284px on its own —
 * comfortably inside AVAILABLE. An over-long word would get its own
 * overflowing line rather than an infinite loop.
 */
export function packLines(wordLengths: number[]): LineRange[] {
  if (wordLengths.length === 0) return [];

  const lines: LineRange[] = [];
  let from = 0;

  for (let i = 0; i < wordLengths.length; i++) {
    if (i > from && lineWidth(wordLengths.slice(from, i + 1)) > AVAILABLE) {
      lines.push({ from, to: i });
      from = i;
    }
  }
  lines.push({ from, to: wordLengths.length });

  return lines;
}
