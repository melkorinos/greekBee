// shareText.ts — emoji summary of a finished round (pure). SPOILER-FREE: never
// names the brand, the sector, or shows the mark — only a fixed row of guess
// cells + the score. Accent-free by construction (emoji, digits, accent-free
// "Σκορ").
//
// The row is a fixed MAX_GUESSES-wide grid so it reads the same length every day:
// 🟩 the solving guess, 🟦 a wrong (revealing) guess, ⬜ an unused slot — e.g.
// 🟦🟦🟩⬜⬜⬜.

import { LOGOPAIGNIO } from "@/config/gameRules";
import { composeShareText } from "@/lib/shareText";

import type { LogopaignioState } from "../types";

import { computeScore } from "./scoring";

const HEADER = "🔎";

/** Shareable, spoiler-free summary of the round.
 *
 *  The rows are unchanged from the day this Game was built; what they now go
 *  through is the shared spine (`composeShareText`, ADR 0025), which adds the
 *  identity line and the link. This Game is `hidden` and its content is a
 *  placeholder, so it inherits the spine and nothing was redesigned here. */
export function buildShareText(state: LogopaignioState, date: string): string {
  const cells: string[] = [];
  for (let i = 0; i < LOGOPAIGNIO.MAX_GUESSES; i++) {
    const guess = state.guesses[i];
    cells.push(guess ? (guess.correct ? "🟩" : "🟦") : "⬜");
  }
  return composeShareText({
    gameId: "logopaignio",
    date,
    rows:   [HEADER, cells.join("")],
    score:  computeScore(state),
  });
}
