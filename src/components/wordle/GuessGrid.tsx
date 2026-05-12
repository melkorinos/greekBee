"use client";

// The 6×N grid of Tiles that displays all guesses + the current input row.

import type { GuessResult, TileState } from "@/games/wordle/types";

import { Tile } from "./Tile";

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

  return (
    <div className="flex flex-col gap-1.5" role="grid" aria-label="Guess grid">
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-1.5" role="row">
          {row.letters.map((letter, ci) => (
            <Tile
              key={ci}
              letter={letter.toUpperCase()}
              state={row.states[ci]}
              animate={ri < guesses.length}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
