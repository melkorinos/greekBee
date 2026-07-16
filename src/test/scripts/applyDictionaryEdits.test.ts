// Unit tests for the dictionary-edit orchestrator.
//
// This module is the whole of what apply-nominations and apply-proposed-words
// share: words-el.json I/O, add/remove dedup routing, the registry walk, and the
// operator report. Its interface is its test surface — feed it edit requests
// over a temp dictionary and a fake registry, assert the files and the result.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { applyDictionaryEdits } from "../../../scripts/lib/resync/applyDictionaryEdits";
import type { RegisteredResync } from "../../../scripts/lib/resync/registry";
import type { DictionaryEdits, ResyncReport } from "../../../scripts/lib/resync/types";

let dir: string;
let wordsElPath: string;

/** Records what the orchestrator handed each adapter, and with which options. */
const spyRegistry = (report: ResyncReport = { changed: [], warnings: [] }) => {
  const calls: { edits: DictionaryEdits; dryRun: boolean }[] = [];
  const registry: RegisteredResync[] = [
    {
      id: "fake",
      apply(edits, { dryRun }) {
        calls.push({ edits, dryRun });
        return report;
      },
    },
  ];
  return { registry, calls };
};

const dictionary = () => JSON.parse(readFileSync(wordsElPath, "utf8")) as string[];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "apply-edits-"));
  wordsElPath = join(dir, "words-el.json");
  writeFileSync(wordsElPath, JSON.stringify(["αλφα", "βητα"]), "utf8");
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("applyDictionaryEdits — the dictionary", () => {
  it("adds a new word and writes the list back sorted", () => {
    const { registry } = spyRegistry();

    const result = applyDictionaryEdits([{ word: "γαμα", direction: "add" }], {
      dryRun: false,
      registry,
      wordsElPath,
      log: vi.fn(),
    });

    expect(result.added).toEqual(["γαμα"]);
    expect(result.wordListChanged).toBe(true);
    expect(dictionary()).toEqual(["αλφα", "βητα", "γαμα"].sort());
  });

  it("removes a word that is present", () => {
    const { registry } = spyRegistry();

    const result = applyDictionaryEdits([{ word: "αλφα", direction: "remove" }], {
      dryRun: false,
      registry,
      wordsElPath,
      log: vi.fn(),
    });

    expect(result.removed).toEqual(["αλφα"]);
    expect(dictionary()).toEqual(["βητα"]);
  });

  it("serialises with no whitespace, matching every other tool byte for byte", () => {
    const { registry } = spyRegistry();

    applyDictionaryEdits([{ word: "γαμα", direction: "add" }], {
      dryRun: false,
      registry,
      wordsElPath,
      log: vi.fn(),
    });

    expect(readFileSync(wordsElPath, "utf8")).toBe('["αλφα","βητα","γαμα"]');
  });

  it("normalises the requested word before applying it", () => {
    const { registry, calls } = spyRegistry();

    // Accented input must land as its normalised form, or the dedup check and
    // every downstream adapter would be comparing against the wrong key.
    const result = applyDictionaryEdits([{ word: "ΓΆΜΑ", direction: "add" }], {
      dryRun: false,
      registry,
      wordsElPath,
      log: vi.fn(),
    });

    expect(result.added).toEqual(["γαμα"]);
    expect(calls[0].edits.added).toEqual(["γαμα"]);
    expect(dictionary()).toContain("γαμα");
  });

  it("skips an add that already exists and a remove that is absent", () => {
    const { registry, calls } = spyRegistry();

    const result = applyDictionaryEdits(
      [
        { word: "αλφα", direction: "add" },
        { word: "ζητα", direction: "remove" },
      ],
      { dryRun: false, registry, wordsElPath, log: vi.fn() },
    );

    expect(result.skipped).toEqual(["αλφα", "ζητα"]);
    expect(result.wordListChanged).toBe(false);
    // Nothing changed, so neither the dictionary nor any adapter is touched.
    expect(dictionary()).toEqual(["αλφα", "βητα"]);
    expect(calls).toHaveLength(0);
  });

  it("never writes on a dry run, but still previews the re-sync", () => {
    const { registry, calls } = spyRegistry();

    const result = applyDictionaryEdits([{ word: "γαμα", direction: "add" }], {
      dryRun: true,
      registry,
      wordsElPath,
      log: vi.fn(),
    });

    expect(dictionary()).toEqual(["αλφα", "βητα"]);
    expect(result.added).toEqual(["γαμα"]);
    expect(calls).toEqual([{ edits: { added: ["γαμα"], removed: [] }, dryRun: true }]);
  });
});

describe("applyDictionaryEdits — the registry walk", () => {
  it("hands every adapter the landed edits, skips excluded", () => {
    const { registry, calls } = spyRegistry();

    applyDictionaryEdits(
      [
        { word: "γαμα", direction: "add" },
        { word: "αλφα", direction: "add" }, // already present → not an edit
        { word: "βητα", direction: "remove" },
      ],
      { dryRun: false, registry, wordsElPath, log: vi.fn() },
    );

    expect(calls).toEqual([
      { edits: { added: ["γαμα"], removed: ["βητα"] }, dryRun: false },
    ]);
  });

  it("collects and reports warnings from the adapters", () => {
    const { registry } = spyRegistry({ changed: [], warnings: ["needs a human"] });
    const log = vi.fn();

    const result = applyDictionaryEdits([{ word: "γαμα", direction: "add" }], {
      dryRun: false,
      registry,
      wordsElPath,
      log,
    });

    expect(result.warnings).toEqual(["needs a human"]);
    expect(log.mock.calls.flat().join("\n")).toContain("needs a human");
  });
});
