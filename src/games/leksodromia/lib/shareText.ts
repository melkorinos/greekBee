// shareText.ts — Λεξοδρομία's Round End summary (pure). SPOILER-FREE: the state
// carries all ten answers and the on-screen recap prints them; the text carries
// only outcomes.
//
// Ten cells, one per word (ADR 0025: one emoji per unit): ✅ solved / ⏭️ skipped.
// Cells follow RESOLUTION order, which is the order the player lived — a
// skipped-once word is requeued and records its result when it is finally
// resolved, so there is always exactly one cell per word.

import { composeShareText } from "@/lib/shareText";

import type { LeksodromiaState } from "../types";
import { getTotalScore } from "./leksodromiaReducer";

/** Shareable, spoiler-free summary of the round. */
export function buildShareText(state: LeksodromiaState, date: string): string {
  const row = state.results.map((r) => (r.status === "solved" ? "✅" : "⏭️")).join("");

  return composeShareText({
    gameId: "leksodromia",
    date,
    rows:   [row],
    score:  getTotalScore(state),
  });
}
