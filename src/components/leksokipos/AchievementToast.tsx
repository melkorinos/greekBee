"use client";

// AchievementToast — the in-game unlock pop-up for a single freshly-earned badge.
//
// Which badges reach here (and the suppression of ones earned in a prior session)
// is owned by useAchievementSync; this component only renders one badge and clears
// itself after its lifetime. Neutral surface + 🏆, semantic tokens only (ADR 0008).

import { useEffect } from "react";

import type { EarnedToast } from "@/games/leksokipos/lib/achievements";

/** How long a toast stays before auto-dismissing. UI timing, not a balance knob. */
const TOAST_LIFETIME_MS = 4500;

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
      <span className="text-xl" aria-hidden="true">🏆</span>
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
