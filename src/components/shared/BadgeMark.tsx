// BadgeMark — the drawn achievement badge, shared by all three badge surfaces:
// the leaderboard chip, the Trophy Case tile, and the unlock toast (TICKET-03).
//
// A badge is three layers: a RING in the tier's strong colour, a DISC behind the
// mark in the tier's soft colour, and the MARK, which is always `currentColor` and
// never changes with tier. That is why five drawings cover every badge at every
// tier and every size — a tier is a colour, never a different picture.
//
// Locked is a neutral frame built from existing tokens rather than a dimmed tier:
// borrowing a tier colour would advertise a rung the player has not earned, and a
// greyscale filter would hide the mark. The mark stays visible on purpose, so a
// player can see what they are chasing. This is what deleted the 🔒.

import type { BadgeMarkArt, TierName } from "@/games/leksokipos/lib/achievements";

/** Ring + disc classes per tier. Locked is deliberately absent — see NEUTRAL below. */
const TIER_FRAME: Record<TierName, { ring: string; disc: string }> = {
  chalkino: { ring: "bg-tier-chalkino", disc: "bg-tier-chalkino-soft" },
  asimenio: { ring: "bg-tier-asimenio", disc: "bg-tier-asimenio-soft" },
  chryso:   { ring: "bg-tier-chryso",   disc: "bg-tier-chryso-soft" },
  diamanti: { ring: "bg-tier-diamanti", disc: "bg-tier-diamanti-soft" },
};

/** The locked / unresolved frame — existing semantic tokens only, no tier hue. */
const NEUTRAL = { ring: "bg-border", disc: "bg-surface-raised" };

/**
 * Ring width is size / 10 with a 1px floor, so the badge reads the same at the
 * 14px leaderboard chip as at the 32px tile. Tailwind cannot emit an arbitrary
 * runtime pixel value, so the size arrives as a custom property and the width and
 * the box both derive from it — one number in, everything else follows.
 */
const BOX  = "w-[var(--badge-size)] h-[var(--badge-size)] p-[max(1px,calc(var(--badge-size)/10))]";

/** The mark occupies 66% of the inner disc — enough air that the ring stays a ring. */
const MARK = "w-[66%] h-[66%]";

export function BadgeMark({
  mark,
  tier,
  size,
  locked = false,
}: {
  mark: BadgeMarkArt;
  /** The resolved tier, or null when nothing is resolved (renders neutral). */
  tier:  TierName | null;
  /** Rendered box in pixels — 14 on a leaderboard chip, 32 on a Trophy Case tile. */
  size:  number;
  /** Not yet earned: neutral frame, muted mark, dimmed — but still drawn. */
  locked?: boolean;
}) {
  const frame = !locked && tier ? TIER_FRAME[tier] : NEUTRAL;

  return (
    <span
      data-testid="badge-mark"
      data-tier={locked ? null : tier}
      data-locked={locked ? "true" : null}
      aria-hidden="true"
      style={{ "--badge-size": `${size}px` } as React.CSSProperties}
      className={
        `inline-flex shrink-0 rounded-full align-middle ${BOX} ${frame.ring} ` +
        (locked ? "text-muted opacity-55" : "text-foreground")
      }
    >
      <span className={`flex h-full w-full items-center justify-center rounded-full ${frame.disc}`}>
        <svg viewBox={mark.viewBox} className={`block fill-current ${MARK}`}>
          <path d={mark.path} />
        </svg>
      </span>
    </span>
  );
}
