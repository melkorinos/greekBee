// Unit tests for the Leksodromia re-sync adapter used by apply-nominations.ts.
//
// Closes a real gap: anagramAlternates.json decides which rack-formed words earn
// credit. It is keyed by the CURATED answer pools (answers-{N}.json) with values
// drawn from the Leksiarxeio guess lists (words-{N}.json) — so it is derived from
// the dictionary transitively, through words-{N}. A nomination that never reaches
// it either keeps crediting a deleted word, or denies credit for an added one.
//
// Mirrors generate-leksodromia-anagrams.ts exactly: values are the same-length
// anagrams of an answer excluding the answer itself, sorted; answers with no
// alternates are omitted entirely.

import { describe, it, expect } from "vitest";

import { leksodromiaAdapter } from "../../../scripts/lib/resync/leksodromia";
import type { LeksodromiaResyncContent } from "../../../scripts/lib/resync/leksodromia";

const content = (): LeksodromiaResyncContent => ({
  alternates: { αβγο: ["γοβα"] },
  answersByLength: {
    4: ["αβγο"],
    5: ["αβολο"], // deliberately has no alternates yet
    6: [],
    7: [],
    8: [],
  },
});

const resync = (added: string[] = [], removed: string[] = []) =>
  leksodromiaAdapter.resync(content(), { added, removed });

describe("leksodromiaAdapter.resync — additions", () => {
  it("adds a new anagram to an answer that already has alternates", () => {
    const { content: next, report } = resync(["βγαο"]); // anagram of αβγο
    expect(next.alternates["αβγο"]).toEqual(["βγαο", "γοβα"]); // sorted
    expect(report.changed[0]).toMatchObject({ id: "αβγο", added: ["βγαο"] });
  });

  it("creates a key for an answer that previously had no alternates", () => {
    const { content: next, report } = resync(["οβολα"]); // anagram of αβολο
    expect(next.alternates["αβολο"]).toEqual(["οβολα"]);
    expect(report.changed[0]).toMatchObject({ id: "αβολο", added: ["οβολα"] });
  });

  it("ignores a word that is not an anagram of any answer", () => {
    const { content: next, report } = resync(["σουσι"]);
    expect(next.alternates).toEqual({ αβγο: ["γοβα"] });
    expect(report.changed).toHaveLength(0);
  });

  it("ignores a word outside the configured lengths", () => {
    const { content: next, report } = resync(["φως"]); // len 3
    expect(report.changed).toHaveLength(0);
    expect(next.alternates).toEqual({ αβγο: ["γοβα"] });
  });

  it("never lists an answer as its own alternate", () => {
    const { content: next, report } = resync(["αβγο"]); // the answer itself
    expect(next.alternates["αβγο"]).toEqual(["γοβα"]);
    expect(report.changed).toHaveLength(0);
  });

  it("does not duplicate an alternate already listed", () => {
    const { content: next, report } = resync(["γοβα"]);
    expect(next.alternates["αβγο"]).toEqual(["γοβα"]);
    expect(report.changed).toHaveLength(0);
  });
});

describe("leksodromiaAdapter.resync — removals", () => {
  it("drops a removed word from an answer's alternates", () => {
    const before = content();
    before.alternates["αβγο"] = ["βγαο", "γοβα"];
    const { content: next, report } = leksodromiaAdapter.resync(before, {
      added: [],
      removed: ["γοβα"],
    });
    expect(next.alternates["αβγο"]).toEqual(["βγαο"]);
    expect(report.changed[0].removed).toEqual(["γοβα"]);
  });

  it("omits the key entirely when its last alternate is removed", () => {
    const { content: next, report } = resync([], ["γοβα"]);
    expect(next.alternates).not.toHaveProperty("αβγο");
    expect(report.changed[0].removed).toEqual(["γοβα"]);
  });

  it("warns when a curated answer word leaves the dictionary", () => {
    const { content: next, report } = resync([], ["αβγο"]);
    // The answer pool is curated — the map is keyed by it and must not be edited.
    expect(next.alternates["αβγο"]).toEqual(["γοβα"]);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toContain("αβγο");
  });

  it("lets removal win when a word is both added and removed", () => {
    const { content: next } = resync(["βγαο"], ["βγαο"]);
    expect(next.alternates["αβγο"]).toEqual(["γοβα"]);
  });
});

describe("leksodromiaAdapter.resync — no-ops", () => {
  it("reports nothing when there are no edits", () => {
    const { content: next, report } = resync();
    expect(next.alternates).toEqual({ αβγο: ["γοβα"] });
    expect(report.changed).toHaveLength(0);
    expect(report.warnings).toEqual([]);
  });
});
