import { describe, expect, it } from "vitest";

import { makeInitialPosokaneiState, posokaneiReducer } from "@/games/posokanei/lib/posokaneiReducer";
import { buildShareText } from "@/games/posokanei/lib/shareText";
import type { PosokaneiPuzzle } from "@/games/posokanei/types";

const DATE = "2026-08-17";

const TARGET: PosokaneiPuzzle = {
  date: "2026-08-01", item: "Αγγούρι", itemType: "generic", unit: "τεμ",
  price: 2.0, band: 0.1, photo: "/x.svg", photoSource: "x", photoLicense: "x",
  sourceStore: "x", sourceDate: "2026-08-01",
};

describe("buildShareText", () => {
  it("never leaks the item name or the price", () => {
    let s = makeInitialPosokaneiState(TARGET);
    s = posokaneiReducer(s, { type: "GUESS", value: 1.0 });
    s = posokaneiReducer(s, { type: "GUESS", value: 2.0 });
    const text = buildShareText(s, DATE);
    expect(text).not.toContain("Αγγούρι");
    expect(text).not.toContain("2");  // no digits from the price/item
    // (the score line uses digits, so check the guess row alone)
    const rows = text.split("\n");
    expect(rows[2]).not.toMatch(/\d/);
  });

  it("marks a solved guess with 🟩", () => {
    const s = posokaneiReducer(makeInitialPosokaneiState(TARGET), { type: "GUESS", value: 2.0 });
    expect(buildShareText(s, DATE).split("\n")[2]).toBe("🟩");
  });

  it("shows a direction arrow for a wrong guess", () => {
    let s = makeInitialPosokaneiState(TARGET);
    s = posokaneiReducer(s, { type: "GUESS", value: 0.5 });  // way too low → higher ⬆️
    s = posokaneiReducer(s, { type: "GUESS", value: 2.0 });
    const row = buildShareText(s, DATE).split("\n")[2];
    expect(row).toContain("⬆️");
    expect(row).toContain("🟩");
  });

  it("carries the score line above the link", () => {
    const s = posokaneiReducer(makeInitialPosokaneiState(TARGET), { type: "GUESS", value: 2.0 });
    // The link is now the last line (ADR 0025), so the score sits above it.
    expect(buildShareText(s, DATE).split("\n").at(-2)).toMatch(/^Σκορ: \d+$/);
  });
});
