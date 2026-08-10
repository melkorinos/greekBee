// LeaderboardBadge — the player-selected display badge chip shown beside a name
// on every leaderboard (Handoff B).
//
// A distinct visual element, never text folded into the name string — and since
// TICKET-03 it renders no text at all: one drawn BadgeMark framed in the resolved
// tier's colour, where an emoji glyph plus a 🥉🥈🥇 medal used to sit. That was the
// defect this fixes: `display_name` has no validation beyond `trim()`, so an emoji
// in a player's name sat beside an emoji badge and the two were indistinguishable.
// A drawn mark can never be mistaken for a name character.
//
// The mark is resolved client-side from the frozen catalog; the API supplies only
// the achievement id + the resolved tier.

import { achievementById, type DisplayBadge } from "@/games/leksokipos/lib/achievements";
import { lbBadgeChip } from "@/styles/recipes";

import { BadgeMark } from "./BadgeMark";

/** Chip size in px — small enough to sit on a leaderboard row's text line. */
const CHIP_SIZE_PX = 14;

export function LeaderboardBadge({ badge }: { badge: DisplayBadge }) {
  const achievement = achievementById(badge.achievementId);
  if (!achievement) return null; // unknown id — render nothing rather than a blank chip

  const label = badge.tier
    ? `${achievement.name} — ${achievement.tiers?.find((t) => t.tier === badge.tier)?.label ?? ""}`.trim()
    : achievement.name;

  return (
    // The chip carries the only accessible name: the mark inside is aria-hidden.
    <span data-testid="lb-badge" className={lbBadgeChip} title={label} aria-label={label}>
      <BadgeMark mark={achievement.mark} tier={badge.tier} size={CHIP_SIZE_PX} />
    </span>
  );
}
