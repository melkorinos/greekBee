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

import { GAME_REGISTRY } from "@/config/games";
import {
  KYNIGOS_PANGRAM_ID,
  LEKSOKIPOS_ACHIEVEMENTS,
  SYLLEKTIS_PONTON_ID,
  TIER_MEDALS,
  nextTierThreshold,
  resolveDisplayBadge,
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
  selected,
  onSelect,
}: {
  achievement: Achievement;
  earned:      ReadonlySet<string>;
  liveValue:   number | undefined;
  /** Whether this tile is the player's chosen display badge. */
  selected:    boolean;
  /** Select/deselect this badge — only wired when the tile is earned. */
  onSelect:    (id: string) => void;
}) {
  const tiers = achievement.tiers;

  // A tier counts as held when the server recorded it OR the live value has crossed
  // it — the same belt-and-suspenders rule the chips use, so the tile, its chips and
  // its medal can never disagree. Resolving through resolveDisplayBadge (rather than
  // a local `some`) means the medal here is the same highest-tier-wins answer the
  // leaderboard chip shows.
  const heldIds = tiers
    ? [
        ...earned,
        ...tiers.filter((t) => liveValue !== undefined && liveValue >= t.threshold).map((t) => t.id),
      ]
    : [...earned];

  const resolved = resolveDisplayBadge(achievement.id, heldIds);
  const tileEarned = tiers ? resolved !== null : earned.has(achievement.id);
  const medal = resolved?.tier ? TIER_MEDALS[resolved.tier] : null;

  // Only earned tiles are pickable as the display badge; locked ones are inert.
  const selectable = tileEarned;

  // Progress line only when there's a live source and a next goal remaining.
  const nextThreshold =
    tiers && liveValue !== undefined ? nextTierThreshold(tiers, liveValue) : null;

  return (
    <div
      data-testid="trophy-tile"
      data-earned={tileEarned}
      data-selected={selected}
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
      onClick={selectable ? () => onSelect(achievement.id) : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(achievement.id);
              }
            }
          : undefined
      }
      className={
        "flex flex-col items-center gap-1 rounded-xl border px-3 py-4 text-center transition-shadow " +
        (selectable ? "cursor-pointer " : "") +
        (selected ? "ring-2 ring-game-accent " : "") +
        (tileEarned
          ? "border-border bg-surface-raised"
          : "border-border bg-surface-raised opacity-60")
      }
    >
      <span className={tileEarned ? "text-2xl" : "text-2xl grayscale"} aria-hidden="true">
        {tileEarned ? achievement.glyph : "🔒"}
      </span>
      {medal && (
        <span data-testid={`tile-medal-${achievement.id}`} className="-mt-1 text-sm" aria-hidden="true">
          {medal}
        </span>
      )}
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
  const [selected, setSelected] = useState<string | null>(null);

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

    fetch(`/api/profile/badge?device_uuid=${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("badge fetch failed"))))
      .then((d: { selected_badge_id?: string | null }) => {
        if (!cancelled) setSelected(d.selected_badge_id ?? null);
      })
      .catch(() => { /* no selection to show — leave the picker unselected */ });

    return () => { cancelled = true; };
  }, [deviceId]);

  // Pick a badge (or clear it by tapping the currently-selected tile again).
  // Optimistic: the tile updates immediately; a failed write rolls back.
  function handleSelect(id: string) {
    if (!deviceId) return;
    const next = selected === id ? null : id;
    const previous = selected;
    setSelected(next);
    fetch(`/api/profile/badge`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ device_uuid: deviceId, selected_badge_id: next }),
    })
      .then((r) => { if (!r.ok) throw new Error("badge save failed"); })
      .catch(() => { setSelected(previous); });
  }

  return (
    <div className="px-5 py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        Προθήκη Τροπαίων
      </p>
      <p
        data-testid="trophy-beta-notice"
        className="mb-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-[11px] leading-snug text-muted"
      >
        🚧 Τα επιτεύγματα αφορούν το {GAME_REGISTRY.leksokipos.label} και βρίσκονται σε δοκιμαστική
        λειτουργία (beta): τα τρόπαια ενδέχεται να μηδενιστούν με την επίσημη κυκλοφορία.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {LEKSOKIPOS_ACHIEVEMENTS.map((a) => (
          <TrophyTile
            key={a.id}
            achievement={a}
            earned={earned}
            selected={selected === a.id}
            onSelect={handleSelect}
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
