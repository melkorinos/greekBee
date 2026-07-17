// leksiarxeio.ts — re-sync adapter for the Leksiarxeio guess lists.
//
// Leksiarxeio ships one guess list per word length (words-{4..8}.json), each a
// length-filtered slice of words-el.json. A dictionary edit that never reaches
// them leaves the game accepting a deleted word, or rejecting an added one.
//
// Scope: words-{N}.json for LEKSIARXEIO.LENGTHS ONLY. Two neighbours are
// deliberately outside it:
//
//   • answers-{N}.json — curated answer pools. A human picks what the game asks
//     players to guess, so a Nomination must never touch them.
//   • words-2.json / words-3.json — same directory, same format, but they are
//     Vres Tin Frasi's short-word guess pool, not Leksiarxeio's (it is never
//     played below 4). The vrestifrasi adapter owns those.
//
// Words longer than the largest bucket live in words-el.json and nowhere else;
// for them this adapter is correctly a no-op.

import { LEKSIARXEIO } from "@/config/gameRules";

import { createLengthSlicedWordsAdapter } from "./lengthSlicedWords";
import type { LengthSlicedWordsContent } from "./lengthSlicedWords";

/** This adapter's content shape, under the name its callers already use. */
export type LeksiarxeioResyncContent = LengthSlicedWordsContent;

export const leksiarxeioAdapter = createLengthSlicedWordsAdapter(
  "leksiarxeio",
  LEKSIARXEIO.LENGTHS,
);
