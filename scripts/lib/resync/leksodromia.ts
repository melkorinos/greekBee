// leksodromia.ts — re-sync adapter for the Leksodromia anagram-alternates map.
//
// anagramAlternates.json decides which rack-formed words earn credit: a rack is a
// scramble of one canonical answer, but the same letters often spell OTHER valid
// Greek words (στερησω ↔ σωτηρεσ), and the player should get credit for any of
// them. The map is precomputed offline so the route never ships the MB-scale
// guess lists (Fluid cold-start budget).
//
// How it is derived (this is subtler than it looks):
//   keys   = the CURATED answer pools, answers-{N}.json — never nomination-driven
//   values = same-length anagrams from the guess lists, words-{N}.json — which
//            ARE nomination-driven
// So this file is dictionary-derived *transitively, through words-{N}*, and a
// Nomination of a length in LEKSODROMIA.LENGTHS can change it. Semantics mirror
// generate-leksodromia-anagrams.ts exactly: values sorted, answer excluded from
// its own list, answers with no alternates omitted entirely.
//
// ── The part that CANNOT be auto-fixed ───────────────────────────────────────
// If a removed word is itself a curated ANSWER, the map is unaffected (the answer
// is never its own alternate) but the game will still pose a word that is no
// longer in the dictionary. That is a curated-pool problem, not a derived-data
// problem, so we warn and leave the pool alone rather than silently editing it.

import { readFileSync } from "fs";
import { join } from "path";

import { LEKSODROMIA } from "@/config/gameRules";
import { normalizeLetters } from "@/lib/normalize";

import type { DictionaryEdits, ResyncAdapter, ResyncChange, ResyncReport } from "./types";

const LENGTHS: readonly number[] = LEKSODROMIA.LENGTHS;

const dataDir = join(__dirname, "../../../src/data");
const alternatesPath = join(dataDir, "leksodromia", "anagramAlternates.json");
const answersPath = (n: number) => join(dataDir, "leksiarxeio", `answers-${n}.json`);

/** Same anagram key the generator uses: letters sorted. */
const sortKey = (word: string): string => [...word].sort().join("");

export interface LeksodromiaResyncContent {
  /** answer → its sorted alternates. Answers with none are absent, not empty. */
  alternates: Record<string, string[]>;
  /** Curated answer pools per length — a read-only input; never written back. */
  answersByLength: Record<number, string[]>;
}

const lengthOf = (word: string) => [...word].length;

function resync(
  content: LeksodromiaResyncContent,
  { added, removed }: DictionaryEdits,
): { content: LeksodromiaResyncContent; report: ResyncReport } {
  const addedNorm = [...new Set(added.map(normalizeLetters))];
  const removedNorm = new Set(removed.map(normalizeLetters));

  const alternates: Record<string, string[]> = {};
  for (const [answer, alts] of Object.entries(content.alternates)) {
    alternates[answer] = [...alts];
  }

  const perAnswer = new Map<string, { added: string[]; removed: string[] }>();
  const touch = (answer: string) => {
    let entry = perAnswer.get(answer);
    if (!entry) {
      entry = { added: [], removed: [] };
      perAnswer.set(answer, entry);
    }
    return entry;
  };

  const warnings: string[] = [];

  // ── Removals: drop the word wherever it is credited ─────────────────────────
  for (const [answer, alts] of Object.entries(alternates)) {
    const kept = alts.filter((w) => !removedNorm.has(normalizeLetters(w)));
    if (kept.length === alts.length) continue;

    touch(answer).removed.push(...alts.filter((w) => removedNorm.has(normalizeLetters(w))));
    // An answer with no alternates is omitted entirely — same as the generator.
    if (kept.length === 0) delete alternates[answer];
    else alternates[answer] = kept;
  }

  // ── Additions: credit the word on every answer it anagrams ──────────────────
  if (addedNorm.length > 0) {
    // answer sortKey → answers, built once per length bucket in scope.
    const answersByKey = new Map<string, string[]>();
    for (const n of LENGTHS) {
      for (const answer of content.answersByLength[n] ?? []) {
        const key = sortKey(normalizeLetters(answer));
        const bucket = answersByKey.get(key);
        if (bucket) bucket.push(answer);
        else answersByKey.set(key, [answer]);
      }
    }

    for (const word of addedNorm) {
      if (!LENGTHS.includes(lengthOf(word))) continue; // not in any guess list
      if (removedNorm.has(word)) continue; // removal wins

      for (const answer of answersByKey.get(sortKey(word)) ?? []) {
        if (answer === word) continue; // an answer is never its own alternate
        const alts = alternates[answer] ?? [];
        if (alts.includes(word)) continue; // already credited
        alternates[answer] = [...alts, word].sort();
        touch(answer).added.push(word);
      }
    }
  }

  // ── Curated answers that left the dictionary ────────────────────────────────
  for (const n of LENGTHS) {
    for (const answer of content.answersByLength[n] ?? []) {
      if (removedNorm.has(normalizeLetters(answer))) {
        warnings.push(
          `answers-${n}.json: curated answer "${answer}" was removed from the ` +
            `dictionary — Leksodromia will still pose it. Re-curate the pool; ` +
            `answers-${n}.json left untouched.`,
        );
      }
    }
  }

  const changed: ResyncChange[] = [...perAnswer.entries()]
    .filter(([, d]) => d.added.length > 0 || d.removed.length > 0)
    .map(([answer, d]) => ({ id: answer, added: d.added, removed: d.removed }));

  return {
    content: { alternates, answersByLength: content.answersByLength },
    report: { changed, warnings },
  };
}

export const leksodromiaAdapter: ResyncAdapter<LeksodromiaResyncContent> = {
  id: "leksodromia",

  load: () => {
    const answersByLength: Record<number, string[]> = {};
    for (const n of LENGTHS) {
      answersByLength[n] = JSON.parse(readFileSync(answersPath(n), "utf8")) as string[];
    }
    return {
      alternates: JSON.parse(readFileSync(alternatesPath, "utf8")) as Record<string, string[]>,
      answersByLength,
    };
  },

  resync,

  // Sorted keys + trailing newline — match generate-leksodromia-anagrams.ts
  // exactly, or re-running the generator produces a spurious whole-file diff.
  files: ({ alternates }) => {
    const sorted = Object.fromEntries(
      Object.keys(alternates).sort().map((k) => [k, alternates[k]]),
    );
    return [{ path: alternatesPath, contents: JSON.stringify(sorted) + "\n" }];
  },
};
