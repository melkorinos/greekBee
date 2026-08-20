// shareText.test.ts — Λεξόπλεγμα's Round End summary (pure, ADR 0025).
//
// One green cell per Required Word, then the count of Extra Words: 🟩🟩🟩 +4.
// Deliberately NOT `9/9` — the round only ends when every Required Word is found,
// so a fraction is a constant, and a constant carries no information. And no
// spider-web emoji: the row is the units, not a logo.

import { describe, expect, it } from "vitest";

import { buildShareText } from "@/games/leksoplegma/lib/shareText";
import type { LeksoplegmaPuzzle, LeksoplegmaState } from "@/games/leksoplegma/types";

const DATE = "2026-08-17";

const REQUIRED = ["καλο", "νερο", "μηλον", "θαλασσα", "ουρανοσ"];
const BONUS = ["ρολο", "μονο", "ναοσ", "σορο"];

const PUZZLE: LeksoplegmaPuzzle = {
  id:         "lp-001",
  letters:    "καλονερμηθσυπ",
  paths:      Object.fromEntries(REQUIRED.map((w, i) => [w, [i, i + 1]])),
  bonusWords: BONUS,
};

function state(foundBonus: string[], hintsUsed: string[] = []): LeksoplegmaState {
  return {
    puzzleId:      DATE,
    puzzle:        PUZZLE,
    foundRequired: [...REQUIRED],
    foundBonus,
    hintsUsed,
    wrongTrace:    false,
    status:        "finished",
  };
}

describe("Leksoplegma buildShareText", () => {
  it("never leaks a required or an extra word", () => {
    const text = buildShareText(state(BONUS), DATE);
    for (const word of [...REQUIRED, ...BONUS]) {
      expect(text.toLowerCase()).not.toContain(word);
    }
  });

  it("emits one green cell per required word plus the extras count", () => {
    expect(buildShareText(state(BONUS), DATE).split("\n")[1]).toBe("🟩🟩🟩🟩🟩 +4");
  });

  it("drops the extras suffix when there are none", () => {
    expect(buildShareText(state([]), DATE).split("\n")[1]).toBe("🟩🟩🟩🟩🟩");
  });

  it("carries no n/n fraction and no web emoji", () => {
    // Scoped to the row: the identity line's own DD/MM is a date, not a fraction.
    const row = buildShareText(state(BONUS), DATE).split("\n")[1];
    expect(row).not.toMatch(/\d+\/\d+/);
    expect(row).not.toContain("🕸️");
  });

  it("scores the round, hint costs included", () => {
    // 5 required words = 4+4+5+7+7 letters × 10 = 270, + 4 extras × 25 = 370, − 1 hint × 25.
    expect(buildShareText(state(BONUS, ["καλο"]), DATE)).toContain("Σκορ: 345");
  });

  it("carries the identity line and the bare link", () => {
    const lines = buildShareText(state(BONUS), DATE).split("\n");
    expect(lines[0]).toBe("Leksoplegma 17/08");
    expect(lines[3]).toMatch(/\/leksoplegma$/);
  });
});
