// shareText.ts — Λεξόπλεγμα's Round End summary (pure). SPOILER-FREE: the state
// carries every required and extra word, and the on-screen recap lists them; the
// text carries counts only.
//
// One green cell per Required Word, then the Extra Words as a count: 🟩🟩🟩 +4.
// Two deliberate absences (ADR 0025): no `9/9`, because the round ends only when
// every Required Word is found and a constant carries no information; and no
// spider-web emoji, because the row is one emoji per unit, not a logo.

import { composeShareText } from "@/lib/shareText";

import type { LeksoplegmaState } from "../types";
import { getRoundScore } from "./leksoplegmaReducer";

/** Shareable, spoiler-free summary of the round. */
export function buildShareText(state: LeksoplegmaState, date: string): string {
  const cells = "🟩".repeat(state.foundRequired.length);
  const extras = state.foundBonus.length;

  return composeShareText({
    gameId: "leksoplegma",
    date,
    rows:   [extras > 0 ? `${cells} +${extras}` : cells],
    score:  getRoundScore(state),
  });
}
