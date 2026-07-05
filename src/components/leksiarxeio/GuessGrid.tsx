"use client";

// The 6×N grid of Tiles that displays all guesses + the current input row.
// Tile size scales with word length so the grid always fits on small phones.
// An inline submit button appears to the right of the active row once it is full.

import type { GuessResult, TileState } from "@/games/leksiarxeio/types";

import { Tile } from "./Tile";

// Grid width is capped per word length so tiles stay naturally square (aspect-square).
// Formula: N×48px tiles + (N-1)×6px gaps (gap-1.5). The keyboard stays full max-w-sm
// width — the grid centres inside it, so no horizontal offset occurs.
const TILE_TEXT = "text-base";

// Max-width of the tile grid for each word length, computed as N*48 + (N-1)*6 px.
// Level 8 exceeds max-w-sm so the container simply fills the keyboard width there.
const GRID_MAX_WIDTH: Record<number, string> = {
  4: "max-w-[210px]",
  5: "max-w-[264px]",
  6: "max-w-[318px]",
  7: "max-w-[372px]",
  8: "max-w-full",
};

interface GuessGridProps {
  guesses:      GuessResult[];
  currentInput: string;
  wordLength:   number;
  maxGuesses?:  number;
}

export function GuessGrid({
  guesses,
  currentInput,
  wordLength,
  maxGuesses = 6,
}: GuessGridProps) {
  const rows: Array<{ letters: string[]; states: TileState[] }> = [];

  // Submitted rows
  for (const g of guesses) {
    rows.push({
      letters: g.word.split(""),
      states:  g.tiles,
    });
  }

  // Current input row (if game is still playing)
  if (rows.length < maxGuesses) {
    const letters = currentInput.split("").concat(
      Array(wordLength - currentInput.length).fill("")
    );
    rows.push({
      letters,
      states: letters.map((l) => (l ? "pending" : "empty")),
    });
  }

  // Remaining empty rows
  while (rows.length < maxGuesses) {
    rows.push({
      letters: Array(wordLength).fill(""),
      states:  Array<TileState>(wordLength).fill("empty"),
    });
  }

  const gridMaxW = GRID_MAX_WIDTH[wordLength] ?? "max-w-full";

  return (
    <div data-testid="guess-grid" className={`flex flex-col gap-1.5 w-full mx-auto ${gridMaxW}`} role="grid" aria-label="Guess grid">
      {rows.map((row, ri) => (
        <div key={ri} data-row={ri} className="flex gap-1.5 w-full">
          <div className="flex flex-1 gap-1.5" role="row">
            {row.letters.map((letter, ci) => (
              <Tile
                key={ci}
                letter={letter.toUpperCase()}
                state={row.states[ci]}
                animate={ri < guesses.length}
                sizeClass="flex-1 aspect-square min-w-0"
                textClass={TILE_TEXT}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
