// shareText.ts — the one place the Platform's shared summary is assembled (ADR 0025).
//
// Every Game's Round End produces the SAME lines, and only the middle ones are
// the Game's own:
//
//     Leksokipos 17/08      ← identity: the registry title + the Puzzle's date
//     🟩🟩⬛🟩🟩              ← the Game's row(s), one emoji per unit
//     Σκορ: 17              ← the raw score, no maximum, no leaderboard position
//     https://…/leksokipos  ← the bare route
//
// The `Σκορ` line is OMITTED, not zeroed, for a Game with no scoring at all
// (ADR 0027) — those summaries are three lines. A Game either has a score or the
// line is absent; `Σκορ: 0` would read as a bad round rather than as no round.
//
// Three rulings live here rather than in any Game:
//
//   - The name comes from the registry `title`, never a typed literal, and the
//     PLATFORM's name is deliberately absent: `Leksarxeia` and `Leksiarxeio` are
//     one letter apart, and the link's og:card carries the brand anyway.
//   - The link carries NO `?puzzle=` date, though every route accepts one. A
//     dated link is right for the hour it is posted and wrong forever after —
//     group chats resurface, and the bare route always serves today.
//   - Spoiler-freedom is the caller's job: nothing here inspects a row, so a
//     builder that leaks an answer leaks it. Every builder has a test for that.

import { GAME_REGISTRY, type RegistryGameId } from "@/config/games";
import { PLATFORM_ORIGIN } from "@/config/platform";

export interface ShareTextParts {
  gameId: RegistryGameId;
  /** ISO date (YYYY-MM-DD) of the Puzzle the round was played on. */
  date:   string;
  /** The Game's summary row(s) — one line each, one emoji per unit. */
  rows:   string[];
  /** The round's score. Omitted by a Game that has no scoring — see above. */
  score?: number;
}

/** `2026-08-17` → `17/08`. Display-only, so it lives with the text it formats. */
function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

/** The full shareable summary for one finished round. */
export function composeShareText({ gameId, date, rows, score }: ShareTextParts): string {
  const game = GAME_REGISTRY[gameId];
  return [
    `${game.title} ${formatDayMonth(date)}`,
    ...rows,
    ...(score === undefined ? [] : [`Σκορ: ${score}`]),
    `${PLATFORM_ORIGIN}${game.href}`,
  ].join("\n");
}
