// shareText.ts — emoji summary of a finished round (pure). SPOILER-FREE: never
// names the item or the price, only squares + direction arrows + the score.
// Accent-free by construction (emoji, arrows, digits, and the accent-free "Σκορ").
//
// Per guess: 🟩 correct, else a tier square (🟨 close / ⬛ far, by proximity) plus
// the direction arrow (⬆️ true price higher / ⬇️ lower) — the same information a
// player saw as a hint, minus the actual number.

import { POSOKANEI } from "@/config/gameRules";

import type { PosokaneiState } from "../types";

import { computeScore } from "./scoring";

const CART = "🛒";

function guessSquare(g: { correct: boolean; direction: string; proximityPct: number }): string {
  if (g.correct) return "🟩";
  const tier = g.proximityPct >= POSOKANEI.CLOSE_PROXIMITY_PCT ? "🟨" : "⬛";
  const arrow = g.direction === "higher" ? "⬆️" : "⬇️";
  return `${tier}${arrow}`;
}

/** Shareable, spoiler-free summary of the round. */
export function buildShareText(state: PosokaneiState): string {
  const lines: string[] = [CART];
  if (state.guesses.length > 0) {
    lines.push(state.guesses.map(guessSquare).join(" "));
  }
  lines.push(`Σκορ: ${computeScore(state)}`);
  return lines.join("\n");
}
