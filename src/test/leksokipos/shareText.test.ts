// shareText.test.ts — Λεξόκηπος's Round End summary (pure, ADR 0025).
//
// Λεξόκηπος has no terminal state: Round End is reaching the top Rank on a Daily
// Puzzle, and play continues past it. So the row is the RANK NAME and nothing
// else — no word count, no pangram count, both of which would be a second number
// competing with the score, and the word count is also a partial spoiler about
// how big the garden is.
//
// The score is deliberately LIVE at the moment of sharing, never a snapshot; the
// builder takes it as an argument so a re-share an hour later shares the higher
// number.

import { describe, expect, it } from "vitest";

import { buildShareText } from "@/games/leksokipos/lib/shareText";

const DATE = "2026-08-17";

describe("Leksokipos buildShareText", () => {
  it("emits the rank name, with the Game's own mark", () => {
    const row = buildShareText({ rank: "Απολυτότητα", score: 187, date: DATE }).split("\n")[1];
    expect(row).toBe("🌸 Απολυτότητα");
  });

  it("carries exactly one number — the score", () => {
    const text = buildShareText({ rank: "Απολυτότητα", score: 187, date: DATE });
    const body = text.split("\n").slice(1, 3).join("\n"); // row + score, not the date or link
    expect(body.match(/\d+/g)).toEqual(["187"]);
  });

  it("shares whatever score it is handed, so a later re-share is higher", () => {
    expect(buildShareText({ rank: "Απολυτότητα", score: 187, date: DATE })).toContain("Σκορ: 187");
    expect(buildShareText({ rank: "Απολυτότητα", score: 204, date: DATE })).toContain("Σκορ: 204");
  });

  it("carries the identity line and the bare link", () => {
    const lines = buildShareText({ rank: "Απολυτότητα", score: 187, date: DATE }).split("\n");
    expect(lines[0]).toBe("Leksokipos 17/08");
    expect(lines[3]).toMatch(/\/leksokipos$/);
    expect(lines[3]).not.toContain("/α/"); // never a custom-puzzle board URL
  });
});
