// shareText.ts — emoji summary of a finished round (pure). SPOILER-FREE: never
// names the item or the price, only squares + direction arrows + the score.
// Accent-free by construction (emoji, arrows, digits, and the accent-free "Σκορ").
//
// Per guess: 🟩 correct, else a tier square (🟨 close / ⬛ far, by proximity) plus
// the direction arrow (⬆️ true price higher / ⬇️ lower) — the same information a
// player saw as a hint, minus the actual number.

import { POSOKANEI } from "@/config/gameRules";
import { composeShareText } from "@/lib/shareText";

import type { PosokaneiState } from "../types";

import { computeScore } from "./scoring";

const CART = "🛒";

function guessSquare(g: { correct: boolean; direction: string; proximityPct: number }): string {
  if (g.correct) return "🟩";
  const tier = g.proximityPct >= POSOKANEI.CLOSE_PROXIMITY_PCT ? "🟨" : "⬛";
  const arrow = g.direction === "higher" ? "⬆️" : "⬇️";
  return `${tier}${arrow}`;
}

/** Shareable, spoiler-free summary of the round.
 *
 *  The rows are unchanged from the day this Game was built; what they now go
 *  through is the shared spine (`composeShareText`, ADR 0025), which adds the
 *  identity line and the link. This Game is `hidden` and its content is a
 *  placeholder, so it inherits the spine and nothing was redesigned here. */
export function buildShareText(state: PosokaneiState, date: string): string {
  const rows: string[] = [CART];
  if (state.guesses.length > 0) {
    rows.push(state.guesses.map(guessSquare).join(" "));
  }
  return composeShareText({ gameId: "posokanei", date, rows, score: computeScore(state) });
}
