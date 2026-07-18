// words.test.ts — route-input hygiene for POST /api/words words[].
//
// player_words is append-forever with OPEN RLS (mirrors player_pangrams), so junk
// written there is permanent and no id whitelist is possible for arbitrary words.
// sanitizeFoundWords bounds the junk by shape: normalize (the UNIQUE text key must
// never see two casings / accent-forms of one find — final sigma ς folds to σ,
// accents strip), drop anything shorter than the game's minimum word length or
// non-Greek, de-dupe, and cap the batch. The server runs ZERO validation against a
// puzzle (ADR 0013 lane C) — this is hygiene, not a correctness check.

import { describe, expect, it } from "vitest";

import { sanitizeFoundWords, MAX_WORDS_PER_REQUEST } from "@/games/leksokipos/lib/words";
import { LEKSOKIPOS } from "@/config/gameRules";

/** 24 Greek lowercase letters, no final sigma — for building distinct valid words. */
const GREEK = "αβγδεζηθικλμνξοπρστυφχψω";

describe("sanitizeFoundWords", () => {
  it("keeps valid Greek words at or above the minimum length, normalizing final sigma", () => {
    // ς → σ is part of normalization; the stored/keyed form is the σ form.
    expect(sanitizeFoundWords(["γατα", "διακοπτης"])).toEqual(["γατα", "διακοπτησ"]);
  });

  it("normalizes casing, accents, and final sigma before the UNIQUE key sees them", () => {
    // "Γάτα" and "γατα" are the same find; must collapse to one row.
    expect(sanitizeFoundWords(["Γάτα", "γατα"])).toEqual(["γατα"]);
  });

  it("drops strings shorter than the minimum word length", () => {
    // MIN_WORD_LENGTH is 4 — a 3-letter string is never a valid Leksokipos find.
    expect(sanitizeFoundWords(["γατ", "σπι", "μη"])).toEqual([]);
    // …and keeps the boundary length itself.
    expect(sanitizeFoundWords(["γ".repeat(LEKSOKIPOS.MIN_WORD_LENGTH)])).toHaveLength(1);
  });

  it("drops non-Greek / junk strings", () => {
    expect(sanitizeFoundWords(["hacker", "<script>xxx</script>", "12345"])).toEqual([]);
  });

  it("de-dupes identical finds", () => {
    expect(sanitizeFoundWords(["διακοπτης", "διακοπτης"])).toEqual(["διακοπτησ"]);
  });

  it("caps the batch at MAX_WORDS_PER_REQUEST", () => {
    const many = Array.from(
      { length: MAX_WORDS_PER_REQUEST + 20 },
      (_, i) => `γατα${GREEK[Math.floor(i / GREEK.length)]}${GREEK[i % GREEK.length]}`,
    );
    expect(new Set(many).size).toBe(many.length); // sanity: all distinct
    expect(sanitizeFoundWords(many).length).toBe(MAX_WORDS_PER_REQUEST);
  });

  it("returns [] for non-array input and skips non-string entries", () => {
    expect(sanitizeFoundWords(undefined)).toEqual([]);
    expect(sanitizeFoundWords("γατα")).toEqual([]);
    expect(sanitizeFoundWords([42, null, "γατα"])).toEqual(["γατα"]);
  });
});
