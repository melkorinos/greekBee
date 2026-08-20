// shareText.test.ts — Λεξοδρομία's Round End summary (pure, ADR 0025).
//
// Ten words, ten cells: ✅ solved / ⏭️ skipped. The on-screen recap names every
// word and stays on screen; none of those words may enter the text, which is what
// the spoiler test holds.

import { describe, expect, it } from "vitest";

import { buildShareText } from "@/games/leksodromia/lib/shareText";
import type { LeksodromiaState, LeksodromiaWordResult } from "@/games/leksodromia/types";

const DATE = "2026-08-17";

const WORDS = [
  "καλο", "νερο", "καλοσ", "μηλον", "καλοσυ",
  "θαλασσ", "καλοσυν", "ουρανοσ", "καλοσυνη", "θαλασσεσ",
];

function result(word: string, status: "solved" | "skipped"): LeksodromiaWordResult {
  return { word, status, elapsedMs: 8000, hintsUsed: 0, points: status === "solved" ? 72 : 0 };
}

function state(results: LeksodromiaWordResult[]): LeksodromiaState {
  return {
    puzzleId:       DATE,
    words:          WORDS,
    scrambles:      WORDS.map((w) => [...w].reverse().join("")),
    accepted:       WORDS.map((w) => [w]),
    wordIndex:      results.length,
    retries:        {},
    status:         "finished",
    picked:         [],
    lockedTileIdxs: [],
    hintsUsed:      0,
    wrongSubmit:    false,
    results,
  };
}

const ALL_SOLVED = state(WORDS.map((w) => result(w, "solved")));

describe("Leksodromia buildShareText", () => {
  it("never leaks a word from the round", () => {
    const text = buildShareText(ALL_SOLVED, DATE);
    for (const word of WORDS) expect(text.toLowerCase()).not.toContain(word);
  });

  it("emits ten cells, one per word, marking skips apart from solves", () => {
    const mixed = state(
      WORDS.map((w, i) => result(w, i === 3 || i === 8 ? "skipped" : "solved")),
    );
    const row = buildShareText(mixed, DATE).split("\n")[1];

    expect(row).toBe("✅✅✅⏭️✅✅✅✅⏭️✅");
  });

  it("sums the round's points as the score", () => {
    // Eight solved at 72 each; the two skips score nothing.
    const mixed = state(WORDS.map((w, i) => result(w, i < 8 ? "solved" : "skipped")));
    expect(buildShareText(mixed, DATE)).toContain("Σκορ: 576");
  });

  it("carries the identity line and the bare link", () => {
    const lines = buildShareText(ALL_SOLVED, DATE).split("\n");
    expect(lines[0]).toBe("Leksodromia 17/08");
    expect(lines[3]).toMatch(/\/leksodromia$/);
  });
});
