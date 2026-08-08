// nominationBlocklist.ts — words players may NOT propose adding to the dictionary.
//
// The list is the ~17k proper nouns and foreign words that were deliberately
// curated OUT of the dictionary (people names, place names, months, foreign
// words). Recovered from the word-list removal in git history and stored as a
// version-controlled data file so a new migration/deploy isn't needed to edit it.
//
// The entries are pre-normalised (accent-stripped, final-sigma collapsed) the
// same way `normalizeLetters` normalises, so membership is an O(1) Set hit after
// normalising the candidate. Dual-use words that are also common nouns (νίκη =
// victory, ελπίδα = hope, σοφία = wisdom …) were intentionally KEPT in the
// dictionary and are NOT in this list, so the block has a very low false-positive
// rate.
//
// Small enough (~60 KB gzipped) to bundle into the edge nomination routes.

import blocklist from "@/data/nominations-blocklist.json";

import { normalizeLetters } from "@/lib/normalize";

const BLOCKED = new Set(blocklist as string[]);

/**
 * The ONLY words allowed to be in both this blocklist and words-el.json.
 *
 * The blocklist and the dictionary are meant to be disjoint — the blocklist IS
 * the set of words curated OUT of the dictionary. These 14 month names (the 12
 * modern ones plus the archaic αλωναρησ = July and τρυγητησ = September) are a
 * KNOWN, DEFERRED contradiction: they are blocked from nomination yet remain
 * playable in Leksokipos/Leksiarxeio. Which file should win has not been
 * decided (deferred 2026-07-16, re-affirmed 2026-07-17).
 *
 * This list may only ever SHRINK. `nominationBlocklist.test.ts` pins it against
 * a frozen ceiling, so removing a name from it is a one-way ratchet and adding
 * one is a red test. It is not an escape hatch for new overlap — any other word
 * in both files is drift, and the guard test fails on it.
 *
 * Consumers: the guard test, and apply-time blocklist enforcement (which must
 * not stop a run over a month name that is deliberately in both files).
 */
export const DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP: readonly string[] = [
  "αλωναρησ",
  "απριλιοσ",
  "αυγουστοσ",
  "δεκεμβριοσ",
  "ιανουαριοσ",
  "ιουλιοσ",
  "ιουνιοσ",
  "μαιοσ",
  "μαρτιοσ",
  "νοεμβριοσ",
  "οκτωβριοσ",
  "σεπτεμβριοσ",
  "τρυγητησ",
  "φεβρουαριοσ",
];

/**
 * True when `word` is on the proposal blocklist (a proper noun, month, place or
 * foreign word we don't accept). Normalises internally, so callers may pass a
 * raw or already-normalised word.
 */
export function isBlockedWord(word: string): boolean {
  return BLOCKED.has(normalizeLetters(word).trim());
}
