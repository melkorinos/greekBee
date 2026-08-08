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
// ── Both directions, exhaustively ────────────────────────────────────────────
// Derived data can be wrong in two ways, and BOTH are the bug this guard exists
// for: a removed word that keeps scoring, and an added word that never scores.
// So every check here runs over every game, every puzzle, every word.
//
// Stale REMOVALS are cheap to catch: a set lookup per derived word.
// Missed ADDITIONS need the derived data re-computed from the dictionary, which
// is the expensive direction — and the reason this used to be sampled. It no
// longer is; see the candidate index below for how the cost was removed. That
// matters: a nomination typically touches a handful of puzzles out of ~1000, so
// a sample of a few puzzles has almost no chance of intersecting the damage and
// a missed addition sails through green.
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
import { vrestifrasiAdapter } from "../../../scripts/lib/resync/vrestifrasi";
import { LEKSIARXEIO, LEKSODROMIA, VRESTIFRASI } from "@/config/gameRules";
import { isBlockedWord } from "@/lib/nominationBlocklist";
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

// ── Candidate index ───────────────────────────────────────────────────────────
// Re-deriving one Leksokipos puzzle the obvious way means asking the real
// predicate about all ~795k words, which is ~1s — 1000× that is far too slow for
// CI, and is why this check was once sampled. The index removes that cost.
//
// Every word computeValidWords() can accept is spelled ONLY from the puzzle's
// letters. So group the dictionary by the SET of distinct letters each word uses
// (a bitmask), and a puzzle's candidates are exactly the groups whose letter set
// is a subset of the puzzle's — at most 2^7 = 128 lookups instead of a 795k scan.
//
// This is a PREFILTER, not a second implementation of the rules: it only narrows
// which words get asked about, and the real predicate still makes every
// accept/reject decision. Its failure mode is safe by construction — too narrow a
// prefilter drops a word the puzzle should list, which shows up as a MISSING word
// and turns this file red. It cannot cause a silent pass.

const letterBit = new Map<string, number>();

/** Assigns a bit per distinct letter; only used while indexing the dictionary. */
function maskOfIndexed(word: string): number {
  let mask = 0;
  for (const ch of word) {
    let bit = letterBit.get(ch);
    if (bit === undefined) {
      bit = letterBit.size;
      letterBit.set(ch, bit);
      // A JS bitwise mask holds 31 bits; Greek normalises to 24 letters. If a
      // new alphabet ever breaks that, fail loudly rather than silently
      // corrupting the mask (and quietly weakening this guard).
      if (bit > 30) throw new Error(`alphabet too large for a 31-bit mask: ${letterBit.size}`);
    }
    mask |= 1 << bit;
  }
  return mask;
}

/** Distinct normalised dictionary words, grouped by their letter-set mask. */
const dictByMask = new Map<number, string[]>();
for (const word of dictionary) {
  const mask = maskOfIndexed(word);
  const bucket = dictByMask.get(mask);
  if (bucket) bucket.push(word);
  else dictByMask.set(mask, [word]);
}

/** Letters absent from the dictionary contribute nothing — no word can use them. */
function maskOfKnown(text: string): number {
  let mask = 0;
  for (const ch of text) {
    const bit = letterBit.get(ch);
    if (bit !== undefined) mask |= 1 << bit;
  }
  return mask;
}

/** Every dictionary word spelled only from `letters` — a superset of the answers. */
function candidatesFor(letters: string[]): string[] {
  const mask = maskOfKnown(letters.join(""));
  const out: string[] = [];
  // Standard submask enumeration: walks every subset of `mask`, ending at 0.
  for (let sub = mask; ; sub = (sub - 1) & mask) {
    const bucket = dictByMask.get(sub);
    if (bucket) out.push(...bucket);
    if (sub === 0) break;
  }
  return out;
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

describe("drift guard: vres tin frasi short guess pools", () => {
  // words-2/3.json are the same thing as the 4–8 lists — the dictionary sliced
  // by length — but for Vres Tin Frasi (ADR 0006's 2026-05-29 revision). Until
  // the vrestifrasi adapter existed nothing re-synced them, and they drifted;
  // see the ratchet below.

  // MISSED ADDITIONS are guarded with no exceptions. This is the direction the
  // adapter is here to fix, and it is currently clean — a word the dictionary
  // has but the pool lacks is a short word the game wrongly rejects.
  it.each([...VRESTIFRASI.SHORT_WORD_LENGTHS])(
    "words-%i.json lists every dictionary word of its length",
    (n) => {
      const listed = new Set(
        readJson<string[]>("leksiarxeio", `words-${n}.json`).map(normalizeLetters),
      );
      const expected = [...dictionary].filter((w) => [...w].length === n);
      const missing = expected.filter((w) => !listed.has(w));

      expect(missing.slice(0, 5)).toEqual([]);
    },
  );

  // ── STALE REMOVALS: a pinned, shrink-only ratchet ───────────────────────────
  // The other direction is NOT clean, and deliberately not forced green here.
  //
  // These 118 words are in the pools but not in words-el.json. Every one of them
  // is on the proper-noun blocklist (asserted below): they were curated OUT of
  // the dictionary, and because no adapter owned words-2/3.json, the pools never
  // heard about it — the exact bug this guard exists for, already realised
  // before the guard could see it.
  //
  // They are pinned rather than purged because purging is a GAMEPLAY decision,
  // not a data-hygiene one: dropping "ρει" makes the committed phrase
  // "Τα πάντα ρει" unwinnable (the reducer refuses to submit a guess word that
  // is not in the pool, so the player could not type the right answer). That
  // call is the developer's. Until then the drift is at least visible and frozen.
  //
  // Like DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP, this list may only ever SHRINK:
  // a NEW stale word turns this red, so the adapter's work is still guarded.
  const KNOWN_STALE_SHORT_POOL_WORDS: readonly string[] = [
    // len 2
    "αε", "κω", "λσ", "νδ", "οα", "οε", "ρα",
    // len 3
    "αια", "αμω", "αρκ", "αρλ", "ασα", "ατμ", "αωε", "αωο", "βεα", "βιη", "γεσ",
    "γυη", "δολ", "εαμ", "εκο", "ελι", "εμα", "εμπ", "εοκ", "ερα", "εση", "ευα",
    "ευη", "εφτ", "ζεη", "ηπα", "ηρω", "θωρ", "ιαν", "ιβο", "ιδη", "ικα", "ιλο",
    "ιμα", "ινω", "ιωβ", "ιωσ", "κεα", "κεν", "κιμ", "κκε", "κοχ", "κωσ", "λεα",
    "λεο", "λια", "λιο", "λιρ", "λοσ", "μαη", "μαξ", "μαο", "μει", "μελ", "μιξ",
    "μισ", "μμε", "νει", "νιλ", "νιν", "ντι", "νωε", "οαπ", "οηε", "οια", "οιη",
    "ορφ", "οτε", "οτο", "παπ", "περ", "πιτ", "ποε", "πολ", "πωλ", "ραι", "ρασ",
    "ρεα", "ρει", "ριο", "ροε", "ροθ", "ρον", "ροσ", "σαο", "σεκ", "σιχ", "σον",
    "σρι", "συμ", "ταμ", "ταο", "τει", "τελ", "τζο", "τντ", "τομ", "τσε", "υασ",
    "υλα", "φεζ", "φει", "φιλ", "φοξ", "φπα", "χαλ", "χαν", "χια", "χιε", "χιλ",
    "χιο",
  ];

  const staleInPools = () => {
    const stale: string[] = [];
    for (const n of VRESTIFRASI.SHORT_WORD_LENGTHS) {
      for (const w of readJson<string[]>("leksiarxeio", `words-${n}.json`).map(normalizeLetters)) {
        if (!dictionary.has(w)) stale.push(w);
      }
    }
    return stale;
  };

  it("has no stale pool word beyond the pinned, known-drift list", () => {
    const unexpected = staleInPools().filter((w) => !KNOWN_STALE_SHORT_POOL_WORDS.includes(w));
    expect(unexpected.slice(0, 10)).toEqual([]);
  });

  it("pins the known drift exactly — the list may only shrink", () => {
    // Pinned both ways: a word that gets cleaned up must leave this list too, or
    // the ratchet quietly stops being a ceiling.
    expect([...staleInPools()].sort()).toEqual([...KNOWN_STALE_SHORT_POOL_WORDS].sort());
  });

  it("every known-drift word is blocklisted — none is an accidental deletion", () => {
    // This is what makes the deferral safe to look at: the drift is entirely
    // proper nouns/acronyms curated out on purpose (ΗΠΑ, ΚΚΕ, ΟΤΕ, ΦΠΑ…), not a
    // real Greek word that fell out of the dictionary by mistake.
    const notBlocked = KNOWN_STALE_SHORT_POOL_WORDS.filter((w) => !isBlockedWord(w));
    expect(notBlocked).toEqual([]);
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

  it("lists every word the dictionary now makes valid", () => {
    const incomplete: string[] = [];
    for (const p of puzzles) {
      // The real predicate decides; the index only narrows what it is asked about.
      const candidates = candidatesFor([p.centerLetter, ...p.outerLetters]);
      const expected = computeValidWords(p.centerLetter, p.outerLetters, candidates);
      const listed = new Set(p.validWords.map(normalizeLetters));
      const missing = expected.filter((w) => !listed.has(w));
      if (missing.length > 0) incomplete.push(`${p.id ?? "?"}: ${missing.slice(0, 5).join(", ")}`);
    }
    expect(incomplete.slice(0, 10)).toEqual([]);
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

  // Deliberately NOT run through the candidate index: enumerateBonusWords
  // compares raw dictionary strings (it never normalises), so feeding it the
  // normalised index would change what the real generator sees rather than just
  // narrowing it. It gets the real dictionary, and the ~200 boards cost ~40s.
  // That is the honest price of exhaustiveness here; it buys the only check that
  // catches a bonus word the boards should have gained and didn't.
  it("lists every bonus word the dictionary now makes traceable", () => {
    const incomplete: string[] = [];
    for (const b of boards) {
      const expected = enumerateBonusWords(b.letters, b.paths, wordsEl);
      const listed = new Set(b.bonusWords);
      const missing = expected.filter((w) => !listed.has(w));
      if (missing.length > 0) incomplete.push(`${b.id}: ${missing.slice(0, 5).join(", ")}`);
    }
    expect(incomplete.slice(0, 10)).toEqual([]);
  }, 120_000);
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

  it("vrestifrasi words-{2,3}.json", () => {
    const loaded = vrestifrasiAdapter.load();
    roundTrip(vrestifrasiAdapter.files({ ...loaded, dirty: [...VRESTIFRASI.SHORT_WORD_LENGTHS] }));
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
