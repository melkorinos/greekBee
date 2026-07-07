// pangrams.test.ts — route-input hygiene for POST /api/pangrams words[].
//
// player_pangrams is append-forever with OPEN RLS, so there is no id whitelist
// possible for arbitrary words (unlike /api/achievements). sanitizePangramWords
// bounds the junk instead: normalize (the UNIQUE text key must never see two
// casings/accent-forms of one find — final sigma ς folds to σ, accents strip),
// drop non-pangram-shaped strings, de-dupe, and cap the count. The server runs
// ZERO detection (ADR 0013) — this is hygiene, not verification against a puzzle.

import { describe, expect, it } from "vitest";

import {
  sanitizePangramWords,
  MAX_PANGRAMS_PER_REQUEST,
} from "@/games/leksokipos/lib/pangrams";

/** 24 Greek lowercase letters, no final sigma — for building distinct valid words. */
const GREEK = "αβγδεζηθικλμνξοπρστυφχψω";

describe("sanitizePangramWords", () => {
  it("keeps valid Greek pangram-shaped words (≥ 7 letters), normalizing final sigma", () => {
    // ς → σ is part of normalization; the stored/keyed form is the σ form.
    expect(sanitizePangramWords(["παρακολουθηση", "διακοπτης"])).toEqual([
      "παρακολουθηση",
      "διακοπτησ",
    ]);
  });

  it("normalizes casing, accents, and final sigma before the UNIQUE key sees them", () => {
    // "Παρακολούθησης" and "παρακολουθησης" are the same find; must collapse to one row.
    expect(sanitizePangramWords(["Παρακολούθησης", "παρακολουθησης"])).toEqual([
      "παρακολουθησησ",
    ]);
  });

  it("drops strings too short to be a pangram (a pangram uses all 7 letters)", () => {
    expect(sanitizePangramWords(["γατα", "σπιτι", "μηλο"])).toEqual([]);
  });

  it("drops non-Greek / junk strings", () => {
    expect(sanitizePangramWords(["hacker7letters", "<script>xxx</script>", "1234567"])).toEqual([]);
  });

  it("de-dupes identical finds", () => {
    expect(sanitizePangramWords(["διακοπτης", "διακοπτης"])).toEqual(["διακοπτησ"]);
  });

  it("caps the batch at MAX_PANGRAMS_PER_REQUEST", () => {
    const many = Array.from(
      { length: MAX_PANGRAMS_PER_REQUEST + 20 },
      (_, i) => `διακοπτ${GREEK[Math.floor(i / GREEK.length)]}${GREEK[i % GREEK.length]}`,
    );
    expect(new Set(many).size).toBe(many.length); // sanity: all distinct
    expect(sanitizePangramWords(many).length).toBe(MAX_PANGRAMS_PER_REQUEST);
  });

  it("returns [] for non-array input and skips non-string entries", () => {
    expect(sanitizePangramWords(undefined)).toEqual([]);
    expect(sanitizePangramWords("διακοπτης")).toEqual([]);
    expect(sanitizePangramWords([42, null, "διακοπτης"])).toEqual(["διακοπτησ"]);
  });
});
