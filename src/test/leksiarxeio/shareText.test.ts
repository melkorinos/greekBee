// shareText.test.ts — Λεξιαρχείο's Round End summary (pure, ADR 0025).
//
// Λεξιαρχείο is five Lengths in one day, so its row is five cells: one per
// Length, solved or not. Deliberately NOT `n/6` fractions per Length — that is a
// grid, and the ruling is one emoji per unit.
//
// The builder is handed the ROUNDS, guesses and all, precisely so the spoiler
// test has something to catch: the winning guess IS the answer word.

import { describe, expect, it } from "vitest";

import type { LeksiarxeioLengthRound } from "@/games/leksiarxeio/lib/shareText";
import { buildShareText } from "@/games/leksiarxeio/lib/shareText";
import type { GuessResult, TileState } from "@/games/leksiarxeio/types";

const DATE = "2026-08-17";

function guess(word: string, tiles: TileState = "absent"): GuessResult {
  return { word, tiles: word.split("").map(() => tiles) };
}

/** A won round: `attempts - 1` misses, then the answer. */
function won(length: 4 | 5 | 6 | 7 | 8, answer: string, attempts: number): LeksiarxeioLengthRound {
  const misses = Array.from({ length: attempts - 1 }, () => guess("μισσσσσσ".slice(0, length)));
  return { length, status: "won", guesses: [...misses, guess(answer, "correct")] };
}

/** A lost round: six misses, no answer among them. */
function lost(length: 4 | 5 | 6 | 7 | 8): LeksiarxeioLengthRound {
  return {
    length,
    status:  "lost",
    guesses: Array.from({ length: 6 }, () => guess("μισσσσσσ".slice(0, length))),
  };
}

const ALL_WON: LeksiarxeioLengthRound[] = [
  won(4, "καλο", 1),
  won(5, "καλοσ", 2),
  won(6, "καλοσυ", 3),
  won(7, "καλοσυν", 4),
  won(8, "καλοσυνη", 5),
];

describe("Leksiarxeio buildShareText", () => {
  it("never leaks an answer word", () => {
    const text = buildShareText(ALL_WON, DATE);
    for (const answer of ["καλο", "καλοσ", "καλοσυ", "καλοσυν", "καλοσυνη"]) {
      expect(text.toLowerCase()).not.toContain(answer);
    }
  });

  it("emits one cell per Length — five, whatever happened", () => {
    const mixed = [won(4, "καλο", 1), lost(5), won(6, "καλοσυ", 3), lost(7), won(8, "καλοσυνη", 5)];
    const row = buildShareText(mixed, DATE).split("\n")[1];

    expect([...row].filter((c) => c === "🟩")).toHaveLength(3);
    expect([...row].filter((c) => c === "⬛")).toHaveLength(2);
    expect(row).toBe("🟩⬛🟩⬛🟩");
  });

  it("carries no n/6 fraction", () => {
    expect(buildShareText(ALL_WON, DATE)).not.toMatch(/\d\/6/);
  });

  it("scores the day as the sum of its five Lengths", () => {
    // 6 + 5 + 4 + 3 + 2 — the same per-length points the leaderboard already sums.
    expect(buildShareText(ALL_WON, DATE)).toContain("Σκορ: 20");
  });

  it("scores a lost Length as zero and still shares", () => {
    const text = buildShareText([won(4, "καλο", 1), lost(5), lost(6), lost(7), lost(8)], DATE);
    expect(text).toContain("Σκορ: 6");
    expect(text).toContain("⬛");
  });

  it("carries the identity line and the bare link", () => {
    const lines = buildShareText(ALL_WON, DATE).split("\n");
    expect(lines[0]).toBe("Leksiarxeio 17/08");
    expect(lines[3]).toMatch(/\/leksiarxeio$/);
  });
});
