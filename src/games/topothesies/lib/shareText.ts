// shareText.ts — Worldle-style emoji summary of a finished round (pure).
// SPOILER-FREE: it never names the answer, the capital, or the id — only
// squares (🟩 solve / ⬛ miss) and the direction arrow of each wrong guess, plus
// the score. Accent-free by construction (only emoji, arrows, digits, and the
// accent-free label "Σκορ").

import type { TopothesiesState } from "../types";

import { computeScore } from "./scoring";

const MAP = "🗺️";
const CAPITAL = "🏛️";

/** One glyph per guess: 🟩 for the correct one, ⬛+arrow for each miss. */
function row(guesses: { correct: boolean; hint: { arrow: string } | null }[]): string {
  return guesses
    .map((g) => (g.correct ? "🟩" : `⬛${g.hint ? g.hint.arrow : ""}`))
    .join(" ");
}

/** Shareable, spoiler-free summary of the round. */
export function buildShareText(state: TopothesiesState): string {
  const lines: string[] = [MAP];

  if (state.shapeGuesses.length > 0) {
    lines.push(row(state.shapeGuesses));
  }
  if (state.capitalGuesses.length > 0) {
    lines.push(`${CAPITAL} ${row(state.capitalGuesses)}`);
  }

  lines.push(`Σκορ: ${computeScore(state)}`);
  return lines.join("\n");
}
