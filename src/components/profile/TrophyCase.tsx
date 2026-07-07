"use client";

// TrophyCase — the Trophy Case grid on /profile.
//
// Fetches the device's earned achievement ids (GET /api/achievements) and lights
// the matching one-shot tiles. For each tiered badge it also reads a live lifetime
// value (GET /api/profile/stats: leksokipos_points for Συλλέκτης Πόντων,
// pangram_count for Κυνηγός Πανγκράμ) and lights each tier chip when earned
// server-side OR when the value crosses its threshold (belt-and-suspenders,
// self-consistent with the number shown — ADR 0013), plus an "X / N" progress line
// toward the next uncrossed tier. Page-local by design.

import { useEffect, useState } from "react";

import {
  KYNIGOS_PANGRAM_ID,
  LEKSOKIPOS_ACHIEVEMENTS,
  SYLLEKTIS_PONTON_ID,
  nextTierThreshold,
  type Achievement,
  type AchievementTier,
} from "@/games/leksokipos/lib/achievements";

const fmt = (n: number) => n.toLocaleString("el-GR");

function TierChips({
  tiers,
  earned,
  liveValue,
}: {
  tiers:  readonly AchievementTier[];
  earned: ReadonlySet<string>;
  /** Live value driving live lighting/progress; undefined = no live source. */
  liveValue: number | undefined;
}) {
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
      {tiers.map((t) => {
        const lit = earned.has(t.id) || (liveValue !== undefined && liveValue >= t.threshold);
        return (
          <span
            key={t.id}
            data-testid={`tier-chip-${t.id}`}
            data-earned={lit}
            className={
              "text-[10px] whitespace-nowrap " +
              (lit ? "font-semibold text-foreground" : "text-muted")
            }
          >
            {t.label} · {fmt(t.threshold)}
          </span>
        );
      })}
    </div>
  );
}

function TrophyTile({
  achievement,
  earned,
  liveValue,
}: {
  achievement: Achievement;
  earned:      ReadonlySet<string>;
  liveValue:   number | undefined;
}) {
  const tiers = achievement.tiers;
  // For a one-shot the tile keys on its own id; for a tiered badge, any lit tier
  // (earned or live-crossed) lights the tile so progress is visible at a glance.
  const tileEarned = tiers
    ? tiers.some((t) => earned.has(t.id) || (liveValue !== undefined && liveValue >= t.threshold))
    : earned.has(achievement.id);

  // Progress line only when there's a live source and a next goal remaining.
  const nextThreshold =
    tiers && liveValue !== undefined ? nextTierThreshold(tiers, liveValue) : null;

  return (
    <div
      data-testid="trophy-tile"
      data-earned={tileEarned}
      className={
        "flex flex-col items-center gap-1 rounded-xl border px-3 py-4 text-center " +
        (tileEarned
          ? "border-border bg-surface-raised"
          : "border-border bg-surface-raised opacity-60")
      }
    >
      <span className={tileEarned ? "text-2xl" : "text-2xl grayscale"} aria-hidden="true">
        {tileEarned ? "🏆" : "🔒"}
      </span>
      <span className="text-xs font-semibold text-foreground">{achievement.name}</span>
      <span className="text-[11px] leading-tight text-muted">{achievement.hint}</span>
      {tiers && <TierChips tiers={tiers} earned={earned} liveValue={liveValue} />}
      {nextThreshold !== null && liveValue !== undefined && (
        <span
          data-testid={`tier-progress-${achievement.id}`}
          className="mt-1 text-[10px] font-semibold text-muted tabular-nums"
        >
          {fmt(liveValue)} / {fmt(nextThreshold)}
        </span>
      )}
    </div>
  );
}

export function TrophyCase({ deviceId = "" }: { deviceId?: string }) {
  const [earned, setEarned] = useState<ReadonlySet<string>>(() => new Set());
  const [points, setPoints] = useState<number | undefined>(undefined);
  const [pangrams, setPangrams] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    const id = encodeURIComponent(deviceId);

    fetch(`/api/achievements?device_uuid=${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("achievements fetch failed"))))
      .then((d: { earned?: string[] }) => {
        if (!cancelled) setEarned(new Set(d.earned ?? []));
      })
      .catch(() => { /* leave tiles locked — never block the page */ });

    fetch(`/api/profile/stats?device_uuid=${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("stats fetch failed"))))
      .then((d: { leksokipos_points?: number; pangram_count?: number }) => {
        if (cancelled) return;
        if (typeof d.leksokipos_points === "number") setPoints(d.leksokipos_points);
        if (typeof d.pangram_count === "number") setPangrams(d.pangram_count);
      })
      .catch(() => { /* no live progress — tiers still light from earned facts */ });

    return () => { cancelled = true; };
  }, [deviceId]);

  return (
    <div className="px-5 py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        Προθήκη Τροπαίων
      </p>
      <p
        data-testid="trophy-beta-notice"
        className="mb-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-[11px] leading-snug text-muted"
      >
        🚧 Δοκιμαστική λειτουργία (beta): τα τρόπαια ενδέχεται να μηδενιστούν με την επίσημη κυκλοφορία.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {LEKSOKIPOS_ACHIEVEMENTS.map((a) => (
          <TrophyTile
            key={a.id}
            achievement={a}
            earned={earned}
            // Each tiered badge reads its own live value; one-shots have none.
            liveValue={
              a.id === SYLLEKTIS_PONTON_ID ? points
                : a.id === KYNIGOS_PANGRAM_ID ? pangrams
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
