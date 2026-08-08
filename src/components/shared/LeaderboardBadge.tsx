// LeaderboardBadge — the player-selected display badge chip shown beside a name
// on every leaderboard (Handoff B).
//
// A distinct visual element, never text folded into the name string: the badge
// glyph, plus — for a tiered badge — the podium medal of the highest earned tier.
// Glyph/medal are resolved client-side from the frozen catalog; the API supplies
// only the achievement id + the resolved tier.

import {
  TIER_MEDALS,
  achievementById,
  type DisplayBadge,
} from "@/games/leksokipos/lib/achievements";
import { lbBadgeChip, lbBadgeMedal } from "@/styles/recipes";

export function LeaderboardBadge({ badge }: { badge: DisplayBadge }) {
  const achievement = achievementById(badge.achievementId);
  if (!achievement) return null; // unknown id — render nothing rather than a blank chip

  const medal = badge.tier ? TIER_MEDALS[badge.tier] : null;
  const label = badge.tier
    ? `${achievement.name} — ${achievement.tiers?.find((t) => t.tier === badge.tier)?.label ?? ""}`.trim()
    : achievement.name;

  return (
    <span data-testid="lb-badge" className={lbBadgeChip} title={label} aria-label={label}>
      <span aria-hidden="true">{achievement.glyph}</span>
      {medal && (
        <span className={lbBadgeMedal} aria-hidden="true">
          {medal}
        </span>
      )}
    </span>
  );
}
