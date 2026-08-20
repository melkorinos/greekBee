// shareText.ts — Βρες τη Φράση's Round End summary (pure). SPOILER-FREE: the
// state it is handed carries the phrase and every word typed against it, and
// none of that reaches the text.
//
// One cell per guess MADE — 🟩 the solving guess, ⬛ every other — because a
// letter-level grid was rejected here specifically (ADR 0025): the phrase runs up
// to nine words of eight letters, which is unreadable in a chat bubble and would
// also leak the shape of the answer. A lost round shares the same way, all dark.
// No `Σκορ` line: the Game has no score any more (ADR 0027).

import { composeShareText } from "@/lib/shareText";

import type { VresTinFrasiState } from "../types";

/** What the builder needs: the round, and the puzzle it must not leak. */
export type VresTinFrasiShareInput = Pick<VresTinFrasiState, "puzzle" | "guesses" | "status">;

/** Shareable, spoiler-free summary of the round. */
export function buildShareText(state: VresTinFrasiShareInput, date: string): string {
  const won = state.status === "won";
  const lastIndex = state.guesses.length - 1;
  const row = state.guesses.map((_, i) => (won && i === lastIndex ? "🟩" : "⬛")).join("");

  return composeShareText({
    gameId: "vrestifrasi",
    date,
    rows:   [row],
  });
}
