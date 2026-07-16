// premadeDataConsistency.test.ts — the drift guard.
//
// Several games ship pre-built data DERIVED from words-el.json. Nothing at
// runtime re-derives it, so if the committed data and the committed dictionary
// disagree, the games are quietly wrong: a deleted word keeps scoring, an added
// word never does. That is a production bug that no other test can see.
//
// This file turns that silent drift into a red test. It checks the COMMITTED
// data against the COMMITTED dictionary — it is not a unit test of the re-sync
// adapters (those have their own tests in src/test/scripts/); it is a check that
// re-sync was actually RUN and its output committed.
//
// ── Cost, and what that buys ─────────────────────────────────────────────────
// words-el.json is ~795k words. Fully re-deriving every Leksokipos puzzle
// (~1s each × hundreds) or every Leksoplegma board is far too slow for CI, so
// the checks are tiered:
//
//   exhaustive + cheap — every derived word still exists in the dictionary.
//     This is the direction that catches the real bug (stale REMOVALS), and it
//     runs over every game, every puzzle, every word.
//   exhaustive + exact — Leksiarxeio and Leksodromia are cheap to re-derive in
//     full, so they are compared exactly, both directions.
//   sampled — full re-derivation for a fixed, deterministic sample of Leksokipos
//     puzzles and Leksoplegma boards. This is the direction that catches missed
//     ADDITIONS. Sampled, not skipped: an add that lands in the dictionary but
//     no derived data is overwhelmingly likely to miss the sample too.
//
// If this file goes red after a dictionary edit, the fix is to run the re-sync
// (npm run apply-nominations) and commit the data — not to relax the assertion.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import { leksiarxeioAdapter } from "../../../scripts/lib/resync/leksiarxeio";
import { leksodromiaAdapter } from "../../../scripts/lib/resync/leksodromia";
import { leksokiposAdapter } from "../../../scripts/lib/resync/leksokipos";
import { leksoplegmaAdapter } from "../../../scripts/lib/resync/leksoplegma";
import { LEKSIARXEIO, LEKSODROMIA } from "@/config/gameRules";
import { normalizeLetters } from "@/lib/normalize";
import { computeValidWords } from "@/games/leksokipos/lib/computeValidWords";
import { BONUS_MIN_LENGTH, canTrace, enumerateBonusWords } from "@/games/leksoplegma/lib/generator";
import { edgesOf } from "@/games/leksoplegma/lib/graph";
import type { LeksoplegmaPuzzle } from "@/games/leksoplegma/types";

const dataDir = join(__dirname, "../../data");
const readJson = <T>(...rel: string[]): T =>
  JSON.parse(readFileSync(join(dataDir, ...rel), "utf8")) as T;

interface LeksokiposPuzzle {
  id?: string;
  centerLetter: string;
  outerLetters: string[];
  validWords: string[];
}

const wordsEl = readJson<string[]>("words-el.json");
const dictionary = new Set(wordsEl.map(normalizeLetters));

/** Deterministic spread across a list — never random, so failures reproduce. */
function sample<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = Math.floor(items.length / count);
  return Array.from({ length: count }, (_, i) => items[i * step]);
}

describe("words-el.json", () => {
  it("is the single source every other list derives from", () => {
    expect(wordsEl.length).toBeGreaterThan(100_000);
  });
});

describe("drift guard: leksiarxeio guess lists", () => {
  // Cheap to re-derive in full: words-{N}.json is exactly the dictionary sliced
  // by length, in normalised form.
  it.each([...LEKSIARXEIO.LENGTHS])("words-%i.json is exactly the dictionary slice", (n) => {
    const listed = new Set(
      readJson<string[]>("leksiarxeio", `words-${n}.json`).map(normalizeLetters),
    );
    const expected = new Set([...dictionary].filter((w) => [...w].length === n));

    const missing = [...expected].filter((w) => !listed.has(w));
    const stale = [...listed].filter((w) => !dictionary.has(w));

    expect({ missing: missing.slice(0, 5), stale: stale.slice(0, 5) }).toEqual({
      missing: [],
      stale: [],
    });
    expect(listed.size).toBe(expected.size);
  });
});

describe("drift guard: leksokipos puzzles", () => {
  const puzzles = readJson<LeksokiposPuzzle[]>("leksokipos", "puzzles-el.json");

  it("never lists a word that left the dictionary", () => {
    const stale: string[] = [];
    for (const p of puzzles) {
      for (const w of p.validWords) {
        if (!dictionary.has(normalizeLetters(w))) stale.push(`${p.id ?? "?"}:${w}`);
      }
    }
    expect(stale.slice(0, 10)).toEqual([]);
  });

  it("lists every word the dictionary now makes valid (sampled)", () => {
    for (const p of sample(puzzles, 3)) {
      const expected = new Set(computeValidWords(p.centerLetter, p.outerLetters, wordsEl));
      const listed = new Set(p.validWords.map(normalizeLetters));
      const missing = [...expected].filter((w) => !listed.has(w));
      expect({ id: p.id, missing: missing.slice(0, 5) }).toEqual({ id: p.id, missing: [] });
    }
  });
});

describe("drift guard: leksoplegma boards", () => {
  const boards = readJson<LeksoplegmaPuzzle[]>("leksoplegma", "puzzles-el.json");

  it("never lists a bonus word that left the dictionary", () => {
    const stale: string[] = [];
    for (const b of boards) {
      for (const w of b.bonusWords) {
        if (!dictionary.has(normalizeLetters(w))) stale.push(`${b.id}:${w}`);
      }
    }
    expect(stale.slice(0, 10)).toEqual([]);
  });

  it("only lists bonus words the board can actually trace", () => {
    const untraceable: string[] = [];
    for (const b of boards) {
      const edges = edgesOf(b.paths);
      for (const w of b.bonusWords) {
        if (w.length < BONUS_MIN_LENGTH || !canTrace(w, b.letters, edges)) {
          untraceable.push(`${b.id}:${w}`);
        }
      }
    }
    expect(untraceable.slice(0, 10)).toEqual([]);
  });

  it("lists every bonus word the dictionary now makes traceable (sampled)", () => {
    for (const b of sample(boards, 2)) {
      const expected = enumerateBonusWords(b.letters, b.paths, wordsEl);
      const listed = new Set(b.bonusWords);
      const missing = expected.filter((w) => !listed.has(w));
      expect({ id: b.id, missing: missing.slice(0, 5) }).toEqual({ id: b.id, missing: [] });
    }
  });
});

describe("write path: serialisation is byte-identical to what is on disk", () => {
  // The write path is the one part of re-sync that a dry run never exercises, so
  // a format mistake would only surface by silently reformatting a data file on
  // the first real run. files() is pure, so we can assert the exact bytes here
  // without writing anything: load() → files() must reproduce the committed file.
  //
  // Line endings are normalised because core.autocrlf checks these files out with
  // CRLF on Windows while git stores (and JSON.stringify emits) LF. That
  // difference is git's, not ours, and produces no diff on commit.
  const lf = (s: string) => s.replace(/\r\n/g, "\n");

  const roundTrip = (files: { path: string; contents: string }[]) => {
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect({ path: file.path, same: lf(file.contents) === lf(readFileSync(file.path, "utf8")) })
        .toEqual({ path: file.path, same: true });
    }
  };

  it("leksokipos puzzles-el.json", () => {
    roundTrip(leksokiposAdapter.files(leksokiposAdapter.load()));
  });

  it("leksoplegma puzzles-el.json", () => {
    roundTrip(leksoplegmaAdapter.files(leksoplegmaAdapter.load()));
  });

  it("leksodromia anagramAlternates.json", () => {
    roundTrip(leksodromiaAdapter.files(leksodromiaAdapter.load()));
  });

  it("leksiarxeio words-{N}.json", () => {
    // files() emits only dirty buckets; mark them all to serialise every file.
    const loaded = leksiarxeioAdapter.load();
    roundTrip(leksiarxeioAdapter.files({ ...loaded, dirty: [...LEKSIARXEIO.LENGTHS] }));
  });
});

describe("drift guard: leksodromia anagram alternates", () => {
  // Cheap to re-derive in full — this mirrors generate-leksodromia-anagrams.ts.
  it("matches a full re-derivation from the curated pools and guess lists", () => {
    const sortKey = (word: string) => [...word].sort().join("");
    const expected: Record<string, string[]> = {};

    for (const n of LEKSODROMIA.LENGTHS) {
      const words = readJson<string[]>("leksiarxeio", `words-${n}.json`);
      const answers = readJson<string[]>("leksiarxeio", `answers-${n}.json`);

      const groups = new Map<string, string[]>();
      for (const word of words) {
        const key = sortKey(word);
        const bucket = groups.get(key);
        if (bucket) bucket.push(word);
        else groups.set(key, [word]);
      }

      for (const answer of answers) {
        const alts = (groups.get(sortKey(answer)) ?? []).filter((w) => w !== answer).sort();
        if (alts.length > 0) expected[answer] = alts;
      }
    }

    const committed = readJson<Record<string, string[]>>("leksodromia", "anagramAlternates.json");
    expect(committed).toEqual(expected);
  });
});
