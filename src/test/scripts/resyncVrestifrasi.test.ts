// Unit tests for the Vres Tin Frasi re-sync adapter used by apply-nominations.ts.
//
// Vres Tin Frasi validates a player's guess words against pools covering lengths
// 2–8. Lengths 4–8 are Leksiarxeio's guess lists (its own adapter keeps those
// fresh); lengths 2–3 exist ONLY for this game, and are what this adapter owns.
//
// Guards the same contract as the Leksiarxeio adapter — an edited word lands in
// (or leaves) the bucket for its own length and no other, and only buckets that
// actually changed are marked dirty — plus the boundary that matters here: this
// adapter must not touch lengths 4–8, or two adapters would write the same file.

import { describe, it, expect } from "vitest";

import { LEKSIARXEIO, VRESTIFRASI } from "@/config/gameRules";
import { vrestifrasiAdapter } from "../../../scripts/lib/resync/vrestifrasi";
import type { LengthSlicedWordsContent } from "../../../scripts/lib/resync/lengthSlicedWords";

const content = (): LengthSlicedWordsContent => ({
  byLength: {
    2: ["να", "σε"],
    3: ["δεσ", "πεσ"],
  },
  dirty: [],
});

const resync = (added: string[] = [], removed: string[] = []) =>
  vrestifrasiAdapter.resync(content(), { added, removed });

describe("vrestifrasiAdapter.resync", () => {
  it("routes an added word to the bucket for its own length only", () => {
    const { content: next, report } = resync(["βρε"]); // len 3
    expect(next.byLength[3]).toContain("βρε");
    expect(next.byLength[2]).not.toContain("βρε");
    expect(next.dirty).toEqual([3]);
    expect(report.changed).toEqual([{ id: "words-3.json", added: ["βρε"], removed: [] }]);
  });

  it("removes a word from the bucket for its own length", () => {
    const { content: next, report } = resync([], ["πες"]);
    expect(next.byLength[3]).not.toContain("πεσ");
    expect(next.dirty).toEqual([3]);
    // Reports speak in normalised forms: πες → πεσ (final sigma → σ).
    expect(report.changed[0].removed).toEqual(["πεσ"]);
  });

  it("ignores a word longer than the largest short bucket", () => {
    // len 5 is Leksiarxeio's territory — this adapter must not claim it, or two
    // adapters would race to write the same words-{N}.json.
    const { content: next, report } = resync(["λαμπα"]);
    expect(next.dirty).toEqual([]);
    expect(report.changed).toHaveLength(0);
  });

  it("ignores a single-letter word — no pool covers it", () => {
    const { content: next, report } = resync(["ο"]);
    expect(next.dirty).toEqual([]);
    expect(report.changed).toHaveLength(0);
  });

  it("does not duplicate a word the bucket already lists", () => {
    const { content: next, report } = resync(["δες"]);
    expect(next.byLength[3].filter((w) => w === "δεσ")).toHaveLength(1);
    expect(report.changed).toHaveLength(0);
    expect(next.dirty).toEqual([]);
  });

  it("ignores removal of a word the bucket does not list", () => {
    const { content: next, report } = resync([], ["ναι"]);
    expect(next.dirty).toEqual([]);
    expect(report.changed).toHaveLength(0);
  });

  it("marks every touched bucket dirty when edits span lengths", () => {
    const { content: next } = resync(["ως", "βρε"]); // len 2 and 3
    expect([...next.dirty].sort()).toEqual([2, 3]);
  });

  it("reports nothing when there are no edits", () => {
    const { content: next, report } = resync();
    expect(next.dirty).toEqual([]);
    expect(report.changed).toHaveLength(0);
  });

  it("covers exactly the configured short lengths", () => {
    expect([...VRESTIFRASI.SHORT_WORD_LENGTHS]).toEqual([2, 3]);
  });

  it("reports no warnings — every guess-pool edit is auto-fixable", () => {
    const { report } = resync(["βρε"], ["πες"]);
    expect(report.warnings).toEqual([]);
  });

  it("is registered under its RegistryGameId", () => {
    expect(vrestifrasiAdapter.id).toBe("vrestifrasi");
  });

  // Both adapters write src/data/leksiarxeio/words-{N}.json. If the two length
  // sets ever overlapped, two adapters would own one file and the second write
  // would clobber the first — so the disjointness is a hard invariant, not a
  // coincidence of the current numbers.
  it("owns lengths disjoint from the Leksiarxeio adapter's", () => {
    const overlap = [...VRESTIFRASI.SHORT_WORD_LENGTHS].filter((n) =>
      ([...LEKSIARXEIO.LENGTHS] as number[]).includes(n),
    );
    expect(overlap).toEqual([]);
  });
});
