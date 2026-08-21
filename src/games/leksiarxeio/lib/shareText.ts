// shareText.ts — Λεξιαρχείο's Round End summary (pure). SPOILER-FREE: the rounds
// it is handed carry every guess the player typed — the winning one IS the answer
// word — and none of them reach the text. Only five squares do: the Game has no
// score any more (ADR 0027), so `composeShareText` omits the `Σκορ` line.
//
// One cell per Length (ADR 0025: one emoji per unit), 🟩 solved / ⬛ not. No `n/6`
// fraction per Length: that is a grid, and a grid of five rows is unreadable in a
// chat bubble. A lost Length is still shared — Round End here is all five Lengths
// RESOLVED, won or lost, so a single lost Length must never block the panel.

import { LEKSIARXEIO } from "@/config/gameRules";
import { composeShareText } from "@/lib/shareText";

import type { GuessResult, LeksiarxeioLength, LeksiarxeioStatus } from "../types";

/** One Length's finished round, as the board holds it (live or restored). */
export interface LeksiarxeioLengthRound {
  length:  LeksiarxeioLength;
  guesses: GuessResult[];
  status:  LeksiarxeioStatus;
}

/** Shareable, spoiler-free summary of the day's five Lengths. */
export function buildShareText(rounds: LeksiarxeioLengthRound[], date: string): string {
  const byLength = new Map(rounds.map((r) => [r.length, r]));
  const row = LEKSIARXEIO.LENGTHS
    .map((length) => (byLength.get(length)?.status === "won" ? "🟩" : "⬛"))
    .join("");

  return composeShareText({
    gameId: "leksiarxeio",
    date,
    rows:   [row],
  });
}
