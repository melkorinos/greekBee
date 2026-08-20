// shareText.test.ts — Worldle-style emoji summary (pure).
// The share must be SPOILER-FREE (never names the answer/capital or its id),
// carry one square per guess with the direction arrows, and hold no accents/PII.

import { describe, expect, it } from "vitest";

import type { TopothesiesAnswer } from "@/games/topothesies/types";
import { computeScore } from "@/games/topothesies/lib/scoring";
import { buildShareText } from "@/games/topothesies/lib/shareText";
import {
  makeInitialTopothesiesState,
  topothesiesReducer,
} from "@/games/topothesies/lib/topothesiesReducer";

const MAX_KM = 500;
const DATE = "2026-08-17";

function mk(partial: Partial<TopothesiesAnswer> & { id: string }): TopothesiesAnswer {
  return {
    name: partial.id,
    nameNormalized: partial.id,
    capital: partial.id,
    capitalNormalized: partial.id,
    capitalCoord: [24, 39],
    centroid: [24, 39],
    aliases: [],
    region: "region",
    isIsland: false,
    ...partial,
  };
}

const TARGET = mk({
  id: "naxos",
  name: "Νάξος",
  nameNormalized: "ναξοσ",
  capital: "Χώρα",
  capitalNormalized: "χωρα",
  capitalCoord: [25.5, 37.1],
  centroid: [25.5, 37.1],
});
const MILOS = mk({
  id: "milos",
  name: "Μήλος",
  nameNormalized: "μηλοσ",
  capital: "Πλάκα",
  capitalNormalized: "πλακα",
  capitalCoord: [24.42, 36.74],
  centroid: [24.42, 36.74],
});
const ANSWERS = [TARGET, MILOS];
const init = () => makeInitialTopothesiesState(TARGET, ANSWERS, MAX_KM);

/** No combining diacritics anywhere (the platform no-accent invariant). */
function hasNoAccents(text: string): boolean {
  return !/[̀-ͯ]/.test(text.normalize("NFD"));
}

describe("buildShareText", () => {
  it("never leaks the answer name, capital, or id (spoiler-free)", () => {
    let s = topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Μήλος" });
    s = topothesiesReducer(s, { type: "GUESS_SHAPE", text: "Νάξος" });
    s = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Χώρα" });
    const text = buildShareText(s, DATE);
    expect(text).not.toContain("naxos");
    expect(text).not.toContain("Νάξος");
    expect(text).not.toContain("Χώρα");
    expect(text).not.toContain("Μήλος");
  });

  it("contains no accents", () => {
    let s = topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Μήλος" });
    s = topothesiesReducer(s, { type: "GUESS_SHAPE", text: "Νάξος" });
    s = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Πλάκα" });
    s = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Χώρα" });
    expect(hasNoAccents(buildShareText(s, DATE))).toBe(true);
  });

  it("shows one square per shape guess and a green square on the solve", () => {
    let s = topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Μήλος" });
    s = topothesiesReducer(s, { type: "GUESS_SHAPE", text: "Νάξος" }); // solved 2nd
    const text = buildShareText(s, DATE);
    const squares = (text.match(/🟩|⬛/gu) ?? []).length;
    expect(squares).toBeGreaterThanOrEqual(2); // ≥ the 2 shape guesses
    expect(text).toContain("🟩");
  });

  it("marks a failed shape stage with only dark squares (no green) on the shape line", () => {
    let s = init();
    for (let i = 0; i < 4; i++) s = topothesiesReducer(s, { type: "GUESS_SHAPE", text: "Μήλος" });
    const shapeLine = buildShareText(s, DATE).split("\n").find((l) => /⬛|🟩/u.test(l))!;
    expect(shapeLine).toContain("⬛");
    expect(shapeLine).not.toContain("🟩");
  });

  it("emits no direction arrows on the capital line (capital stage has no distance hint)", () => {
    let s = topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Νάξος" }); // solve shape
    s = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Πλάκα" }); // wrong-but-known capital
    s = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Χώρα" }); // correct capital
    const capitalLine = buildShareText(s, DATE).split("\n").find((l) => l.startsWith("🏛️"))!;
    expect(capitalLine).toMatch(/⬛/u); // has the wrong-guess square
    expect(capitalLine).not.toMatch(/[↑↗→↘↓↙←↖]/u); // but no arrow
  });

  it("includes the numeric score", () => {
    let s = topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Νάξος" });
    s = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Χώρα" });
    expect(buildShareText(s, DATE)).toContain(String(computeScore(s)));
  });
});

// ── The shared four-line spine (ADR 0025) ─────────────────────────────────────
// Topothesies was the only Game already sharing anything, and it keeps both its
// rows and its direction arrows — the one deliberate exception to one row per
// Game. What it GAINS is the identity line and the link.

describe("buildShareText — the shared spine", () => {

  it("opens with the Game's name and the date, and closes with the bare link", () => {
    let s = topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Νάξος" });
    s = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Χώρα" });
    const lines = buildShareText(s, DATE).split("\n");

    expect(lines[0]).toBe("Topothesies 17/08");
    expect(lines[lines.length - 1]).toMatch(/^https?:\/\/.+\/topothesies$/);
    expect(lines[lines.length - 1]).not.toContain("?puzzle=");
  });

  it("keeps both rows and their direction arrows", () => {
    let s = topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Μήλος" });
    s = topothesiesReducer(s, { type: "GUESS_SHAPE", text: "Νάξος" });
    s = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Χώρα" });
    const lines = buildShareText(s, DATE).split("\n");

    expect(lines).toHaveLength(5);
    expect(lines[1]).toMatch(/^🗺️/u);
    expect(lines[1]).toMatch(/[↑↗→↘↓↙←↖]/u);
    expect(lines[2]).toMatch(/^🏛️/u);
  });
});
