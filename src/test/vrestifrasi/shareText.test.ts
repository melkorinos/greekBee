// shareText.test.ts — Βρες τη Φράση's Round End summary (pure, ADR 0025).
//
// One cell per guess MADE, not per letter: the phrase runs up to nine words of
// eight letters, and that grid is unreadable in a chat bubble. So a round solved
// on the third guess is ⬛⬛🟩 — three cells, nothing about which letters landed.
//
// The builder is handed the whole state, phrase included, so the spoiler test has
// something real to catch.

import { describe, expect, it } from "vitest";

import { buildShareText } from "@/games/vrestifrasi/lib/shareText";
import type {
  PhraseGuessResult,
  VresTinFrasiState,
  VresTinFrasiStatus,
} from "@/games/vrestifrasi/types";

const DATE = "2026-08-17";
const PHRASE = "Μαθαινω και διδασκω";
const WORDS = ["μαθαινω", "και", "διδασκω"];

function guess(words: string[]): PhraseGuessResult {
  return { words, tiles: words.map((w) => w.split("").map(() => "absent" as const)) };
}

function state(guesses: PhraseGuessResult[], status: VresTinFrasiStatus): VresTinFrasiState {
  return {
    puzzle: {
      id:              "2026-08-17-vresi",
      date:            DATE,
      phrase:          PHRASE,
      normalizedWords: WORDS,
      wordLengths:     WORDS.map((w) => w.length),
    },
    guesses,
    currentWords:     ["", "", ""],
    currentWordIndex: 0,
    status,
    lastMessage:      null,
  };
}

const MISS = guess(["ξεχναω", "και", "ξεχνασ"]);
const SOLVE = guess(WORDS);

describe("Vres Tin Frasi buildShareText", () => {
  it("never leaks the phrase or any of its words", () => {
    const text = buildShareText(state([MISS, MISS, SOLVE], "won"), DATE);
    expect(text.toLowerCase()).not.toContain("μαθαινω");
    expect(text.toLowerCase()).not.toContain("διδασκω");
    expect(text).not.toContain(PHRASE);
  });

  it("emits one cell per guess made, green on the solving guess", () => {
    const row = buildShareText(state([MISS, MISS, SOLVE], "won"), DATE).split("\n")[1];
    expect(row).toBe("⬛⬛🟩");
  });

  it("is not a letter grid — one line, one cell per guess", () => {
    const text = buildShareText(state([MISS, MISS, SOLVE], "won"), DATE);
    // Three lines, not four: no `Σκορ` line, because the Game has no score
    // (ADR 0027).
    expect(text.split("\n")).toHaveLength(3);
    // Three guesses over a 17-letter phrase would be 51 cells as a grid.
    expect([...text.split("\n")[1]].length).toBe(3);
  });

  it("shares a lost round as all-dark cells", () => {
    const row = buildShareText(state(Array(6).fill(MISS), "lost"), DATE).split("\n")[1];
    expect(row).toBe("⬛⬛⬛⬛⬛⬛");
  });

  // ADR 0027: the Game's scoring is gone, so the summary carries no `Σκορ` line
  // — omitted, never `Σκορ: 0`, which would read as a bad round.
  it("carries no score line, won or lost", () => {
    expect(buildShareText(state([MISS, MISS, SOLVE], "won"), DATE)).not.toContain("Σκορ");
    expect(buildShareText(state(Array(6).fill(MISS), "lost"), DATE)).not.toContain("Σκορ");
  });

  it("carries the identity line and the bare link", () => {
    const lines = buildShareText(state([SOLVE], "won"), DATE).split("\n");
    expect(lines[0]).toBe("Vres Tin Frasi 17/08");
    expect(lines[2]).toMatch(/\/vres-tin-frasi$/);
  });
});
