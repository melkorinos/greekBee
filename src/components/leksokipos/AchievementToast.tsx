"use client";

// AchievementToast — the in-game unlock pop-up for a single freshly-earned badge.
//
// Which badges reach here (and the suppression of ones earned in a prior session)
// is owned by useAchievementSync; this component only renders one badge and clears
// itself after its lifetime. Neutral surface, semantic tokens only (ADR 0008).
//
// The badge is drawn, framed at the rung just earned — it was a fixed 🏆 until
// TICKET-03, so every unlock looked the same whichever badge was won.

import { useEffect } from "react";

import { BadgeMark } from "@/components/shared/BadgeMark";
import type { EarnedToast } from "@/games/leksokipos/lib/achievements";

/** How long a toast stays before auto-dismissing. UI timing, not a balance knob. */
const TOAST_LIFETIME_MS = 4500;

/** Toast badge size in px — slightly larger than a tile; this is the reveal. */
const TOAST_BADGE_PX = 34;

export function AchievementToast({
  badge,
  onDismiss,
}: {
  badge:     EarnedToast;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, TOAST_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const message = badge.tierLabel
    ? `${badge.name} — ${badge.tierLabel}`
    : `Ξεκλείδωσες: ${badge.name}`;

  return (
    <div
      role="status"
      data-testid="achievement-toast"
      className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-lg"
    >
      <BadgeMark mark={badge.mark} tier={badge.tier ?? null} size={TOAST_BADGE_PX} />
      <span className="flex-1 text-sm font-semibold text-foreground">{message}</span>
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={onDismiss}
        className="ml-1 shrink-0 text-muted hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}
