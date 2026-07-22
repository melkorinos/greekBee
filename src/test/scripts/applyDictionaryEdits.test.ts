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

// ── The apply-time blocklist gate ────────────────────────────────────────────
//
// The blocklist is a version-controlled JSON file, editable without a deploy —
// so a word can be approved while clean and blocklisted before the apply runs.
// Propose-time checks (the two edge routes) cannot see that window. This gate
// re-checks at the moment of the write, treating the blocklist as authoritative.
//
// A hit STOPS the run rather than skipping the word: a silent skip would leave
// the row `accepted` forever and re-trigger on every subsequent run.

describe("applyDictionaryEdits — the blocklist gate", () => {
  it("refuses a blocklisted add: nothing written, no adapter run, run fails", () => {
    const { registry, calls } = spyRegistry();

    // μαρια is a real blocklist entry (a person name curated out of the dictionary).
    expect(() =>
      applyDictionaryEdits(
        [
          { word: "γαμα", direction: "add" },
          { word: "μαρια", direction: "add" },
        ],
        { dryRun: false, registry, wordsElPath, log: vi.fn() },
      ),
    ).toThrow(/μαρια/);

    // The gate runs before any write, so the clean word in the same batch is
    // held back too — the operator resolves the conflict and re-runs the batch.
    expect(dictionary()).toEqual(["αλφα", "βητα"]);
    expect(calls).toHaveLength(0);
  });

  it("names the word and says nothing was written", () => {
    const { registry } = spyRegistry();

    expect(() =>
      applyDictionaryEdits([{ word: "γιωργοσ", direction: "add" }], {
        dryRun: false,
        registry,
        wordsElPath,
        log: vi.fn(),
      }),
    ).toThrow(/γιωργοσ[\s\S]*nothing was written/i);
  });

  it("checks the normalised form, not the raw input", () => {
    const { registry } = spyRegistry();

    // Accented input must not slip past a gate that compares raw strings.
    expect(() =>
      applyDictionaryEdits([{ word: "Μαρία", direction: "add" }], {
        dryRun: false,
        registry,
        wordsElPath,
        log: vi.fn(),
      }),
    ).toThrow(/μαρια/);
  });

  it("fails a dry run identically — that is the run an admin actually reads", () => {
    const { registry } = spyRegistry();

    expect(() =>
      applyDictionaryEdits([{ word: "μαρια", direction: "add" }], {
        dryRun: true,
        registry,
        wordsElPath,
        log: vi.fn(),
      }),
    ).toThrow(/μαρια/);
  });

  it("does not stop over a deferred month name — they are in both files on purpose", () => {
    const { registry } = spyRegistry();

    // ιανουαριοσ is blocklisted AND in words-el.json by deliberate deferral
    // (DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP). A naive isBlockedWord filter
    // would stop a run over it.
    const result = applyDictionaryEdits([{ word: "ιανουαριοσ", direction: "add" }], {
      dryRun: false,
      registry,
      wordsElPath,
      log: vi.fn(),
    });

    expect(result.added).toEqual(["ιανουαριοσ"]);
  });

  it("never blocks a remove — deleting a blocklisted word is the correct outcome", () => {
    writeFileSync(wordsElPath, JSON.stringify(["αλφα", "μαρια"]), "utf8");
    const { registry } = spyRegistry();

    const result = applyDictionaryEdits([{ word: "μαρια", direction: "remove" }], {
      dryRun: false,
      registry,
      wordsElPath,
      log: vi.fn(),
    });

    expect(result.removed).toEqual(["μαρια"]);
    expect(dictionary()).toEqual(["αλφα"]);
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
