// Unit tests for the Leksoplegma re-sync adapter used by apply-nominations.ts.
//
// Closes a real gap: bonusWords are enumerated against words-el.json, so a
// dictionary edit that never reaches them leaves a removed word scoring bonus
// points forever, or an added word unscoreable on boards that can trace it.
//
// The load-bearing rule: `paths` (required words) come from curated pools and are
// baked into the grid geometry. A puzzle can never accept an *add* into paths,
// and a *remove* of a required word cannot be auto-fixed — it must warn and leave
// the geometry alone, never silently mutate it.
//
// Board fixture — letters "αβγδ" (tiles 0..3), one required word "αβγ" traced
// 0→1→2, so the edge web is {0-1, 1-2}. Tile 3 (δ) is isolated: nothing reaches it.

import { describe, it, expect } from "vitest";

import { BONUS_MIN_LENGTH } from "@/games/leksoplegma/lib/generator";
import { leksoplegmaAdapter } from "../../../scripts/lib/resync/leksoplegma";
import type { LeksoplegmaResyncContent } from "../../../scripts/lib/resync/leksoplegma";

const content = (bonusWords: string[] = []): LeksoplegmaResyncContent => [
  {
    id: "leksoplegma-001",
    letters: "αβγδ",
    paths: { αβγ: [0, 1, 2] },
    bonusWords,
  },
];

const resync = (
  before: LeksoplegmaResyncContent,
  added: string[] = [],
  removed: string[] = [],
) => leksoplegmaAdapter.resync(before, { added, removed });

describe("leksoplegmaAdapter.resync — additions", () => {
  it("adds a traceable word to bonusWords", () => {
    const before = content();
    const { content: next, report } = resync(before, ["γβα"]); // 2→1→0 along the web
    expect(next[0].bonusWords).toContain("γβα");
    expect(report.changed[0]).toMatchObject({ id: "leksoplegma-001", added: ["γβα"] });
  });

  it("does not add a word the board cannot trace", () => {
    const before = content();
    const { content: next, report } = resync(before, ["δαβ"]); // δ is isolated
    expect(next[0]).toBe(before[0]); // untouched — identity preserved
    expect(report.changed).toHaveLength(0);
  });

  it("does not add a word below BONUS_MIN_LENGTH", () => {
    expect(BONUS_MIN_LENGTH).toBe(3);
    const before = content();
    const { content: next, report } = resync(before, ["βγ"]); // traceable but too short
    expect(next[0]).toBe(before[0]);
    expect(report.changed).toHaveLength(0);
  });

  it("does not add a word longer than the board", () => {
    const before = content();
    const { content: next } = resync(before, ["αβγδαβ"]); // 6 letters, 4 tiles
    expect(next[0]).toBe(before[0]);
  });

  it("never adds a required word to bonusWords", () => {
    const before = content();
    const { content: next, report } = resync(before, ["αβγ"]); // already a required word
    expect(next[0].bonusWords).not.toContain("αβγ");
    expect(report.changed).toHaveLength(0);
  });

  it("does not duplicate a bonus word already listed", () => {
    const before = content(["γβα"]);
    const { content: next, report } = resync(before, ["γβα"]);
    expect(next[0]).toBe(before[0]);
    expect(report.changed).toHaveLength(0);
  });
});

describe("leksoplegmaAdapter.resync — removals", () => {
  it("drops a removed word from bonusWords", () => {
    const before = content(["γβα"]);
    const { content: next, report } = resync(before, [], ["γβα"]);
    expect(next[0].bonusWords).not.toContain("γβα");
    expect(report.changed[0].removed).toEqual(["γβα"]);
  });

  it("lets removal win when a word is both added and removed", () => {
    const before = content();
    const { content: next } = resync(before, ["γβα"], ["γβα"]);
    expect(next[0].bonusWords).not.toContain("γβα");
  });

  it("warns and leaves paths untouched when a required word is removed", () => {
    const before = content(["γβα"]);
    const { content: next, report } = resync(before, [], ["αβγ"]);

    // Geometry is curated — never silently mutated.
    expect(Object.keys(next[0].paths)).toEqual(["αβγ"]);
    expect(next[0].paths["αβγ"]).toEqual([0, 1, 2]);
    expect(next[0].bonusWords).toEqual(["γβα"]);

    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toContain("leksoplegma-001");
    expect(report.warnings[0]).toContain("αβγ");
  });

  it("does not report a geometry warning as an auto-fixed change", () => {
    const before = content();
    const { report } = resync(before, [], ["αβγ"]);
    expect(report.changed).toHaveLength(0);
  });
});

describe("leksoplegmaAdapter.resync — no-ops", () => {
  it("returns the same puzzle objects when nothing changes", () => {
    const before = content(["γβα"]);
    const { content: next, report } = resync(before);
    expect(next[0]).toBe(before[0]);
    expect(report.changed).toHaveLength(0);
    expect(report.warnings).toEqual([]);
  });
});
