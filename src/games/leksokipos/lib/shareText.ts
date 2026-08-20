// shareText.ts — Λεξόκηπος's Round End summary (pure). SPOILER-FREE by
// construction: it is handed a Rank and a number, never the garden.
//
// The row is the RANK NAME only (ADR 0025). No word count and no pangram count:
// each is a second number competing with the score, and the word count leaks how
// big the garden is on a Game where the whole hunt is not knowing.
//
// The score is a PARAMETER because Λεξόκηπος alone shares a live number. It has
// no terminal state — play continues past the top Rank — so a snapshot taken when
// the panel popped would be stale in the message it was pasted into.

import { GAME_REGISTRY } from "@/config/games";
import { composeShareText } from "@/lib/shareText";

import type { RankName } from "./ranking";

export interface LeksokiposShareInput {
  rank:  RankName;
  /** The score AT THE MOMENT OF SHARING, not at the moment Round End fired. */
  score: number;
  /** ISO date of the Daily Puzzle. Custom Puzzles never reach Round End. */
  date:  string;
}

/** Shareable, spoiler-free summary of the round. */
export function buildShareText({ rank, score, date }: LeksokiposShareInput): string {
  return composeShareText({
    gameId: "leksokipos",
    date,
    rows:   [`${GAME_REGISTRY.leksokipos.emoji} ${rank}`],
    score,
  });
}
