"use client";

import type { PhraseGuessResult, PhraseTileState } from "@/games/vrestifrasi/types";
import type { LineRange } from "./phraseLayout";
import { packLines, TILE_SIZE_CLASS, TILE_TEXT_CLASS } from "./phraseLayout";
import { Tile } from "./Tile";

interface PhraseGridProps {
  guesses:          PhraseGuessResult[];
  currentWords:     string[];
  currentWordIndex: number;
  wordLengths:      number[];
  maxGuesses?:      number;
  /**
   * Put the cursor on a word the player tapped. Only the row being typed is
   * tappable; omit this and the grid is read-only, which is what the jsdom tests
   * that predate word-focus render.
   */
  onFocusWord?:     (wordIndex: number) => void;
}

// ── Row item types ────────────────────────────────────────────────────────────

type RowItem =
  | { kind: "tile";   letter: string; state: PhraseTileState; wordIndex: number }
  | { kind: "spacer" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLine(
  words: string[],
  tiles: PhraseTileState[][],
  wordLengths: number[],
  fromWord: number,
  toWord: number,
): RowItem[] {
  const items: RowItem[] = [];
  for (let wi = fromWord; wi < toWord; wi++) {
    if (wi > fromWord) items.push({ kind: "spacer" });
    for (let li = 0; li < wordLengths[wi]; li++) {
      items.push({
        kind: "tile",
        letter: words[wi]?.[li] ?? "",
        state: tiles[wi]?.[li] ?? "empty",
        wordIndex: wi,
      });
    }
  }
  return items;
}

function buildLines(
  words: string[],
  tiles: PhraseTileState[][],
  wordLengths: number[],
  lineRanges: LineRange[],
): RowItem[][] {
  return lineRanges.map(({ from, to }) => buildLine(words, tiles, wordLengths, from, to));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PhraseGrid({
  guesses,
  currentWords,
  currentWordIndex,
  wordLengths,
  maxGuesses = 6,
  onFocusWord,
}: PhraseGridProps) {
  const lineRanges = packLines(wordLengths);

  type RowData = { words: string[]; tiles: PhraseTileState[][] };
  const rows: RowData[] = [];

  for (const g of guesses) {
    rows.push({ words: g.words, tiles: g.tiles });
  }

  if (rows.length < maxGuesses) {
    rows.push({
      words: wordLengths.map((len, i) => (currentWords[i] ?? "").padEnd(len, " ")),
      // A typed letter is `pending` wherever it sits. This used to read
      // `i <= currentWordIndex ? "pending" : "empty"` — harmless only while the
      // cursor could not move backwards, since nothing could then be typed past
      // it. With FOCUS_WORD it is a bug: tapping back to word 1 of a filled
      // phrase would blank every word after it on screen.
      tiles: wordLengths.map((len, i) => {
        const typed = currentWords[i] ?? "";
        return Array.from({ length: len }, (_, li): PhraseTileState =>
          li < typed.length ? "pending" : "empty",
        );
      }),
    });
  }

  // The full six-row frame is always drawn, even when unplayed. The empty rows
  // are not decoration: they are how the player sees at a glance how many
  // attempts are left, and they keep the board from jumping as guesses land.
  while (rows.length < maxGuesses) {
    rows.push({
      words: wordLengths.map((len) => " ".repeat(len)),
      tiles: wordLengths.map((len) => Array<PhraseTileState>(len).fill("empty")),
    });
  }

  return (
    <div
      className="flex flex-col divide-y divide-border w-full max-w-game mx-auto"
      role="grid"
      aria-label="Phrase guess grid"
    >
      {rows.map((row, ri) => {
        const lines = buildLines(row.words, row.tiles, wordLengths, lineRanges);
        // Exactly one row is being typed: the first unplayed one, and only while
        // guesses remain. It alone carries the cursor ring and the tap targets —
        // a played guess is history, and an unreached row is not editable either.
        const isActiveRow = ri === guesses.length && ri < maxGuesses;
        return (
          <div
            key={ri}
            className="flex flex-col gap-1 py-1.5"
            role="row"
            // Read by VresTinFrasiBoard to keep this row above the pinned
            // keyboard. A data hook rather than a ref chain, so the grid stays a
            // pure renderer and owes the Board nothing.
            data-active-row={isActiveRow ? "true" : undefined}
          >
            {lines.map((items, li) => (
              <div key={li} className="flex gap-1 items-center justify-center w-full">
                {items.map((item, idx) =>
                  item.kind === "spacer" ? (
                    <div key={`sp-${idx}`} className="flex-none w-2" aria-hidden />
                  ) : (
                    <Tile
                      key={idx}
                      letter={item.letter.trim() ? item.letter.toUpperCase() : ""}
                      state={item.state}
                      animate={ri < guesses.length}
                      sizeClass={TILE_SIZE_CLASS}
                      textClass={TILE_TEXT_CLASS}
                      focused={isActiveRow && item.wordIndex === currentWordIndex}
                      onSelect={
                        isActiveRow && onFocusWord
                          ? () => onFocusWord(item.wordIndex)
                          : undefined
                      }
                    />
                  )
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
