// vrestifrasi.ts — re-sync adapter for the Vres Tin Frasi short-word guess pool.
//
// Vres Tin Frasi validates each word of a player's phrase guess against pools
// covering lengths 2–8 (src/app/vres-tin-frasi/page.tsx, and the community
// submission route via games/vrestifrasi/lib/validateSubmission.ts). Lengths 4–8
// are Leksiarxeio's guess lists and its adapter keeps them fresh; lengths 2–3
// exist ONLY for this game — its phrases are full of short function words
// (δες, πες, ντε, βρε) that Leksiarxeio is never played at.
//
// Those two files are dictionary-derived exactly like the 4–8 lists (ADR 0006's
// 2026-05-29 revision made words-el.json the single source for every length), so
// a Nomination that never reaches them leaves the game rejecting an accepted
// short word, or accepting a removed one — silently and forever.
//
// Scope: words-2.json / words-3.json ONLY. The phrases themselves
// (vrestifrasi/phrases-el.json) are authored content, not derived from the
// dictionary, so no Nomination can make them stale and nothing here touches them.

import { VRESTIFRASI } from "@/config/gameRules";

import { createLengthSlicedWordsAdapter } from "./lengthSlicedWords";

export const vrestifrasiAdapter = createLengthSlicedWordsAdapter(
  "vrestifrasi",
  VRESTIFRASI.SHORT_WORD_LENGTHS,
);
