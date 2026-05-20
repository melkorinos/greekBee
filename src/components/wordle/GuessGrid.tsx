"use client";

// The 6×N grid of Tiles that displays all guesses + the current input row.
// Tile size scales with word length so the grid always fits on small phones.
// An inline submit button appears to the right of the active row once it is full.

import type { GuessResult, TileState } from "@/games/wordle/types";

import { Tile } from "./Tile";

// Responsive tile dimensions keyed by word length.
// All values chosen so the widest grid (8 tiles + 7 gaps) fits within 320px
// (the smallest common phone width in portrait orientation).
const TILE_SIZES: Record<number, { tile: string; text: string }> = {
  4: { tile: "w-16 h-16", text: "text-2xl" },
  5: { tile: "w-14 h-14", text: "text-2xl" },
  6: { tile: "w-12 h-12", text: "text-xl"  },
  7: { tile: "w-10 h-10", text: "text-xl"  },
  8: { tile: "w-9  h-9",  text: "text-lg"  },
};

interface GuessGridProps {
  guesses:      GuessResult[];
  currentInput: string;
  wordLength:   number;
  maxGuesses?:  number;
  /** Called when the inline submit button is clicked — only shown when the active row is full */
  onSubmit?:    () => void;
}

export function GuessGrid({
  guesses,
  currentInput,
  wordLength,
  maxGuesses = 6,
  onSubmit,
}: GuessGridProps) {
  const { tile: tileSize, text: textSize } =
    TILE_SIZES[wordLength] ?? TILE_SIZES[5];

  const rows: Array<{ letters: string[]; states: TileState[] }> = [];

  // Submitted rows
  for (const g of guesses) {
    rows.push({
      letters: g.word.split(""),
      states:  g.tiles,
    });
  }

  // Current input row index
  const currentRowIdx = rows.length;

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

  // Show the inline submit button only when the active row is full
  const showSubmit = onSubmit && currentInput.length === wordLength;

  return (
    <div className="flex flex-col gap-1.5" role="grid" aria-label="Guess grid">
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-center gap-1.5">
          {/* Tile row */}
          <div className="flex gap-1.5" role="row">
            {row.letters.map((letter, ci) => (
              <Tile
                key={ci}
                letter={letter.toUpperCase()}
                state={row.states[ci]}
                animate={ri < guesses.length}
                sizeClass={tileSize}
                textClass={textSize}
              />
            ))}
          </div>
          {/* Inline submit button — only beside the active row when full */}
          {ri === currentRowIdx && showSubmit ? (
            <button
              onClick={onSubmit}
              aria-label="Submit guess"
              data-testid="inline-submit"
              className="ml-1 flex items-center justify-center w-9 h-9 rounded-full bg-green-500 hover:bg-green-400 active:opacity-70 text-white text-xl font-bold shrink-0 transition-colors"
            >
              ↵
            </button>
          ) : (
            // Reserve the same space so the grid doesn't shift when button appears
            <div className="ml-1 w-9 shrink-0" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}
