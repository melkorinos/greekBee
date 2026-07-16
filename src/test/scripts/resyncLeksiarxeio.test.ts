// Unit tests for the Leksiarxeio re-sync adapter used by apply-nominations.ts.
// Guards the contract: an edited word lands in (or leaves) the guess list for its
// own length bucket and no other; words outside LEKSIARXEIO.LENGTHS touch nothing;
// only buckets that actually changed are marked dirty, so the writer skips the rest.
//
// Scope note: only words-{N}.json (guess lists) are dictionary-derived.
// answers-{N}.json are curated answer pools and are deliberately never touched.

import { describe, it, expect } from "vitest";

import { LEKSIARXEIO } from "@/config/gameRules";
import { leksiarxeioAdapter } from "../../../scripts/lib/resync/leksiarxeio";
import type { LeksiarxeioResyncContent } from "../../../scripts/lib/resync/leksiarxeio";

const content = (): LeksiarxeioResyncContent => ({
  byLength: {
    4: ["αλμα", "ρεσο"],
    5: ["λαμπα", "κηπος"],
    6: ["σαλεπα"],
    7: ["αμπελοσ"],
    8: ["ανθρωπος"],
  },
  dirty: [],
});

const resync = (added: string[] = [], removed: string[] = []) =>
  leksiarxeioAdapter.resync(content(), { added, removed });

describe("leksiarxeioAdapter.resync", () => {
  it("routes an added word to the bucket for its own length only", () => {
    const { content: next, report } = resync(["σουσι"]); // len 5
    expect(next.byLength[5]).toContain("σουσι");
    expect(next.byLength[4]).not.toContain("σουσι");
    expect(next.byLength[6]).not.toContain("σουσι");
    expect(next.dirty).toEqual([5]);
    expect(report.changed).toEqual([
      { id: "words-5.json", added: ["σουσι"], removed: [] },
    ]);
  });

  it("removes a word from the bucket for its own length", () => {
    const { content: next, report } = resync([], ["κηπος"]);
    expect(next.byLength[5]).not.toContain("κηπος");
    expect(next.dirty).toEqual([5]);
    // Reports speak in normalised forms: κηπος → κηποσ (final sigma → σ).
    expect(report.changed[0].removed).toEqual(["κηποσ"]);
  });

  it("ignores a word shorter than the smallest bucket", () => {
    const { content: next, report } = resync(["φως"]); // len 3 — words-el.json only
    expect(next.dirty).toEqual([]);
    expect(report.changed).toHaveLength(0);
  });

  it("ignores a word longer than the largest bucket", () => {
    const { content: next, report } = resync(["παρασκευασμα"]); // len 12
    expect(next.dirty).toEqual([]);
    expect(report.changed).toHaveLength(0);
  });

  it("does not duplicate a word the bucket already lists", () => {
    const { content: next, report } = resync(["κηπος"]);
    expect(next.byLength[5].filter((w) => w === "κηπος")).toHaveLength(1);
    expect(report.changed).toHaveLength(0);
  });

  it("ignores removal of a word the bucket does not list", () => {
    const { content: next, report } = resync([], ["ουδεις"]);
    expect(next.dirty).toEqual([]);
    expect(report.changed).toHaveLength(0);
  });

  it("marks every touched bucket dirty when edits span lengths", () => {
    const { content: next } = resync(["σουσι", "σαλατα"]); // len 5 and 6
    expect(next.dirty.sort()).toEqual([5, 6]);
  });

  it("reports nothing when there are no edits", () => {
    const { content: next, report } = resync();
    expect(next.dirty).toEqual([]);
    expect(report.changed).toHaveLength(0);
  });

  it("covers exactly the configured lengths", () => {
    expect([...LEKSIARXEIO.LENGTHS]).toEqual([4, 5, 6, 7, 8]);
  });

  it("reports no warnings — every Leksiarxeio edit is auto-fixable", () => {
    const { report } = resync(["σουσι"], ["κηπος"]);
    expect(report.warnings).toEqual([]);
  });
});
