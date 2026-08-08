// nominationBlocklist.test.ts — the proper-noun / month / place / foreign-word
// blocklist that gates word-ADD proposals in Leksikastirio.

import { readFileSync } from "fs";
import { join } from "path";

import { describe, expect, it } from "vitest";

import blocklist from "@/data/nominations-blocklist.json";
import {
  DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP,
  isBlockedWord,
} from "@/lib/nominationBlocklist";

describe("isBlockedWord", () => {
  it("blocks person names that were curated out of the dictionary", () => {
    expect(isBlockedWord("μαρια")).toBe(true);
    expect(isBlockedWord("γιωργοσ")).toBe(true);
    expect(isBlockedWord("ελενη")).toBe(true);
  });

  it("blocks place names", () => {
    expect(isBlockedWord("αθηνα")).toBe(true);   // Athens / Athena
    expect(isBlockedWord("ολυμπια")).toBe(true);
  });

  it("blocks month names in every form", () => {
    expect(isBlockedWord("ιανουαριοσ")).toBe(true);  // nominative
    expect(isBlockedWord("ιανουαριου")).toBe(true);  // genitive (date form)
    expect(isBlockedWord("δεκεμβριοσ")).toBe(true);
  });

  it("normalises accents and final sigma before checking", () => {
    // Input with accents / final sigma must resolve to the stored normalised form.
    expect(isBlockedWord("Μαρία")).toBe(true);
    expect(isBlockedWord("Γιώργος")).toBe(true);
    expect(isBlockedWord("  Αθήνα  ")).toBe(true);
  });

  it("does NOT block common Greek words that double as names (kept in the dictionary)", () => {
    expect(isBlockedWord("νικη")).toBe(false);    // victory / Nike
    expect(isBlockedWord("ελπιδα")).toBe(false);  // hope / Elpida
    expect(isBlockedWord("σοφια")).toBe(false);   // wisdom / Sofia
    expect(isBlockedWord("αγαπη")).toBe(false);   // love / Agapi
  });

  it("does NOT block ordinary words", () => {
    expect(isBlockedWord("καλοσ")).toBe(false);
    expect(isBlockedWord("τραπεζι")).toBe(false);
    expect(isBlockedWord("θαλασσα")).toBe(false);
  });

  it("does NOT block common nouns that double as proper nouns", () => {
    expect(isBlockedWord("ατλασ")).toBe(false);  // atlas (the book) / Atlas
    expect(isBlockedWord("ορκα")).toBe(false);   // orca (the animal) / Orca
  });
});

// ── The disjointness guard ───────────────────────────────────────────────────
//
// The blocklist and words-el.json answer different questions and are meant to
// be disjoint: the blocklist IS the set of words curated OUT of the dictionary.
// Any word in both means a player can PLAY a word the nomination system calls
// unacceptable. Nothing computed this intersection before, so drift was silent
// — the unit tests above pass just as happily with 16,000 overlapping words as
// with 0.
//
// The 14 month names are the one known, deliberate exception (see
// DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP). If this goes red, the fix is to
// resolve the overlap in the data files — NOT to add the word to the allowlist.

describe("blocklist ∩ words-el.json", () => {
  // 19 MB — read from disk rather than statically imported so it never lands in
  // a bundle, matching premadeDataConsistency.test.ts.
  const wordsEl = JSON.parse(
    readFileSync(join(__dirname, "../../data/words-el.json"), "utf8"),
  ) as string[];

  const dictionary = new Set(wordsEl);
  const overlap = (blocklist as string[]).filter((word) => dictionary.has(word)).sort();

  it("contains exactly the deferred month names — nothing else is in both files", () => {
    expect(overlap).toEqual([...DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP].sort());
  });

  // The ratchet. The literal below is the FROZEN CEILING: the overlap as it stood
  // on 2026-07-17, when the month-name question was deferred. The allowlist may
  // shrink out of it as months get resolved; it may never grow. Editing this
  // literal to admit a new word defeats the entire guard — don't.
  it("only ever shrinks — the allowlist may not admit a new word", () => {
    const FROZEN_CEILING_2026_07_17 = new Set([
      "αλωναρησ",
      "απριλιοσ",
      "αυγουστοσ",
      "δεκεμβριοσ",
      "ιανουαριοσ",
      "ιουλιοσ",
      "ιουνιοσ",
      "μαιοσ",
      "μαρτιοσ",
      "νοεμβριοσ",
      "οκτωβριοσ",
      "σεπτεμβριοσ",
      "τρυγητησ",
      "φεβρουαριοσ",
    ]);

    const admitted = DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP.filter(
      (word) => !FROZEN_CEILING_2026_07_17.has(word),
    );
    expect(admitted).toEqual([]);
    expect(DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP.length).toBeLessThanOrEqual(
      FROZEN_CEILING_2026_07_17.size,
    );
  });

  it("has no duplicate entries in the allowlist", () => {
    expect(new Set(DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP).size).toBe(
      DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP.length,
    );
  });
});
