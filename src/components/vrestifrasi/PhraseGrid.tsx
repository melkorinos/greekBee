"use client";

import type { PhraseGuessResult, PhraseTileState } from "@/games/vrestifrasi/types";
import { Tile } from "./Tile";

interface PhraseGridProps {
  guesses:          PhraseGuessResult[];
  currentWords:     string[];
  currentWordIndex: number;
  wordLengths:      number[];
  maxGuesses?:      number;
}

// ── Row item types ────────────────────────────────────────────────────────────

type RowItem =
  | { kind: "tile";   letter: string; state: PhraseTileState }
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
      items.push({ kind: "tile", letter: words[wi]?.[li] ?? "", state: tiles[wi]?.[li] ?? "empty" });
    }
  }
  return items;
}

/**
 * Split words into 1 or 2 visual lines per guess row.
 * ≤2 words → single line; 3–4 words → 2 lines (ceil(n/2) words on line 1).
 */
function buildLines(
  words: string[],
  tiles: PhraseTileState[][],
  wordLengths: number[],
): RowItem[][] {
  const n = wordLengths.length;
  if (n <= 2) return [buildLine(words, tiles, wordLengths, 0, n)];
  const split = Math.ceil(n / 2);
  return [
    buildLine(words, tiles, wordLengths, 0, split),
    buildLine(words, tiles, wordLengths, split, n),
  ];
}

/**
 * Compute a single fixed tile size that fits the densest line.
 * All tiles in the grid share this size — guarantees visual consistency
 * across both lines regardless of how many tiles each line has.
 *
 * Layout constants:
 *   available = 368px (max-w-game 384px – px-2 16px)
 *   spacer    = 12px  (w-3)
 *   gap       =  4px  (gap-1, between every adjacent flex child)
 *
 * For N tiles and S spacers:  total = N*t + S*12 + (N+S-1)*4 ≤ 368
 *                              t_max = (368 – S*12 – (N+S-1)*4) / N
 */
function computeTileClass(wordLengths: number[]): { sizeClass: string; textClass: string } {
  const n = wordLengths.length;
  const split = n <= 2 ? n : Math.ceil(n / 2);

  const tMax = (wLens: number[]) => {
    const N = wLens.reduce((s, l) => s + l, 0);
    const S = Math.max(0, wLens.length - 1);
    if (N === 0) return 999;
    return (368 - S * 12 - (N + S - 1) * 4) / N;
  };

  const line1 = wordLengths.slice(0, split);
  const line2 = wordLengths.slice(split);
  const t = Math.min(tMax(line1), line2.length > 0 ? tMax(line2) : 999);

  if (t >= 40) return { sizeClass: "w-10 h-10", textClass: "text-sm" };
  if (t >= 36) return { sizeClass: "w-9  h-9",  textClass: "text-sm" };
  if (t >= 32) return { sizeClass: "w-8  h-8",  textClass: "text-sm" };
  if (t >= 28) return { sizeClass: "w-7  h-7",  textClass: "text-xs" };
  if (t >= 24) return { sizeClass: "w-6  h-6",  textClass: "text-xs" };
  if (t >= 20) return { sizeClass: "w-5  h-5",  textClass: "text-xs" };
  return               { sizeClass: "w-4  h-4",  textClass: "text-xs" };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PhraseGrid({
  guesses,
  currentWords,
  currentWordIndex,
  wordLengths,
  maxGuesses = 6,
}: PhraseGridProps) {
  const { sizeClass, textClass } = computeTileClass(wordLengths);

  type RowData = { words: string[]; tiles: PhraseTileState[][] };
  const rows: RowData[] = [];

  for (const g of guesses) {
    rows.push({ words: g.words, tiles: g.tiles });
  }

  if (rows.length < maxGuesses) {
    rows.push({
      words: wordLengths.map((len, i) => (currentWords[i] ?? "").padEnd(len, " ")),
      tiles: wordLengths.map((len, i) => {
        const typed = currentWords[i] ?? "";
        return Array.from({ length: len }, (_, li): PhraseTileState => {
          if (li < typed.length) return i <= currentWordIndex ? "pending" : "empty";
          return "empty";
        });
      }),
    });
  }

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
        const lines = buildLines(row.words, row.tiles, wordLengths);
        return (
          <div key={ri} className="flex flex-col gap-1 py-1.5" role="row">
            {lines.map((items, li) => (
              <div key={li} className="flex gap-1 items-center justify-center w-full">
                {items.map((item, idx) =>
                  item.kind === "spacer" ? (
                    <div key={`sp-${idx}`} className="flex-none w-3" aria-hidden />
                  ) : (
                    <Tile
                      key={idx}
                      letter={item.letter.trim() ? item.letter.toUpperCase() : ""}
                      state={item.state}
                      animate={ri < guesses.length}
                      sizeClass={sizeClass}
                      textClass={textClass}
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
