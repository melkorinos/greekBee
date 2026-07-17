// nominationBlocklist.test.ts — the proper-noun / month / place / foreign-word
// blocklist that gates word-ADD proposals in Leksikastirio.

import { describe, expect, it } from "vitest";

import { isBlockedWord } from "@/lib/nominationBlocklist";

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
});
