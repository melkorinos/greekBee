// shareText.ts — emoji summary of a finished round (pure). SPOILER-FREE: never
// names the brand, the sector, or shows the mark — only a fixed row of guess
// cells + the score. Accent-free by construction (emoji, digits, accent-free
// "Σκορ").
//
// The row is a fixed MAX_GUESSES-wide grid so it reads the same length every day:
// 🟩 the solving guess, 🟦 a wrong (revealing) guess, ⬜ an unused slot — e.g.
// 🟦🟦🟩⬜⬜⬜.

import { LOGOPAIGNIO } from "@/config/gameRules";

import type { LogopaignioState } from "../types";

import { computeScore } from "./scoring";

const HEADER = "🔎";

/** Shareable, spoiler-free summary of the round. */
export function buildShareText(state: LogopaignioState): string {
  const cells: string[] = [];
  for (let i = 0; i < LOGOPAIGNIO.MAX_GUESSES; i++) {
    const guess = state.guesses[i];
    cells.push(guess ? (guess.correct ? "🟩" : "🟦") : "⬜");
  }
  return [HEADER, cells.join(""), `Σκορ: ${computeScore(state)}`].join("\n");
}
