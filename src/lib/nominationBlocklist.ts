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
 * True when `word` is on the proposal blocklist (a proper noun, month, place or
 * foreign word we don't accept). Normalises internally, so callers may pass a
 * raw or already-normalised word.
 */
export function isBlockedWord(word: string): boolean {
  return BLOCKED.has(normalizeLetters(word).trim());
}
