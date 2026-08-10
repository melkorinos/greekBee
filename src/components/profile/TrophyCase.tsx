"use client";

// TrophyCase — the Trophy Case grid on /profile.
//
// Fetches the device's earned achievement ids (GET /api/achievements) and lights the
// tiers they prove. Four of the five badges also read a live lifetime value off the
// stats response the PAGE fetches once (useProfileStats, shared with the lifetime
// strip) — leksokipos_points, pangram_count, top_rank_count, tzimani_count — and
// light each tier chip when earned server-side OR when the value crosses its
// threshold (belt-and-suspenders, self-consistent with the number shown — ADR 0013),
// plus an "X / N" progress line toward the next uncrossed tier. Μακρυλέξης is the
// exception: its rungs are exact-length one-shot facts with no cumulative number
// behind them, so it lights from earned ids alone. Page-local by design.

import { useEffect, useMemo, useState } from "react";

import { BadgeMark } from "@/components/shared/BadgeMark";
import { GAME_REGISTRY } from "@/config/games";
import {
  KYNIGOS_PANGRAM_ID,
  LEKSOKIPOS_ACHIEVEMENTS,
  STIN_KORIFI_ID,
  SYLLEKTIS_PONTON_ID,
  TZIMANI_ID,
  detectEarnedTiers,
  nextTierThreshold,
  resolveDisplayBadge,
  type Achievement,
  type AchievementTier,
} from "@/games/leksokipos/lib/achievements";
import type { ProfileStats } from "@/hooks/useProfileStats";

const fmt = (n: number) => n.toLocaleString("el-GR");

/** Tile badge size in px — the largest of the three badge surfaces. */
const TILE_BADGE_PX = 32;

function TierChips({
  tiers,
  held,
}: {
  tiers: readonly AchievementTier[];
  /** Tier ids this player holds — the crossing rule already applied, once. */
  held:  ReadonlySet<string>;
}) {
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
      {tiers.map((t) => {
        const lit = held.has(t.id);
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
  // it. The crossing half runs through detectEarnedTiers — the SAME function the
  // earning lanes use — so the Profile Page cannot drift from the game about which
  // tier a player holds. Resolved once here and handed down, so the tile, its chips
  // and its badge frame read one answer. resolveDisplayBadge (rather than a local
  // `some`) makes that frame the same highest-tier-wins answer the leaderboard shows.
  const held: ReadonlySet<string> = new Set(
    tiers && liveValue !== undefined
      ? [...earned, ...detectEarnedTiers(tiers, liveValue)]
      : earned,
  );

  const resolved = resolveDisplayBadge(achievement.id, [...held]);
  const tileEarned = tiers ? resolved !== null : earned.has(achievement.id);

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
      {/* Earned and locked draw the SAME mark — locked only changes the frame, so a
          player can see what they are chasing instead of a row of identical 🔒. */}
      <BadgeMark
        mark={achievement.mark}
        tier={resolved?.tier ?? null}
        size={TILE_BADGE_PX}
        locked={!tileEarned}
      />
      <span className="text-xs font-semibold text-foreground">{achievement.name}</span>
      <span className="text-[11px] leading-tight text-muted">{achievement.hint}</span>
      {tiers && <TierChips tiers={tiers} held={held} />}
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

/**
 * The lifetime number each tiered badge ladders on, keyed by its base id. Every
 * value comes from the ONE /api/profile/stats response; a badge with no live source
 * (the word-length ladder, whose rungs are one-shot facts) is simply absent.
 */
type LiveValues = Partial<Record<string, number>>;

/**
 * Map each stats field onto the badge that ladders on it. A non-number (absent
 * field, error shape, no response yet) leaves that badge with no live source, so its
 * chips fall back to earned facts alone rather than lighting at zero.
 */
function liveValuesFrom(stats: ProfileStats | null): LiveValues {
  const next: LiveValues = {};
  if (!stats) return next;
  const put = (badgeId: string, value: unknown) => {
    if (typeof value === "number") next[badgeId] = value;
  };
  put(SYLLEKTIS_PONTON_ID, stats.leksokipos_points);
  put(KYNIGOS_PANGRAM_ID,  stats.pangram_count);
  put(STIN_KORIFI_ID,      stats.top_rank_count);
  put(TZIMANI_ID,          stats.tzimani_count);
  return next;
}

export function TrophyCase({
  deviceId = "",
  stats = null,
}: {
  deviceId?: string;
  /** The page's shared /api/profile/stats read; null while loading or on failure. */
  stats?: ProfileStats | null;
}) {
  const [earned, setEarned] = useState<ReadonlySet<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);

  const liveValues = useMemo(() => liveValuesFrom(stats), [stats]);

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
            // Each badge reads its own live value; the word-length ladder has none.
            liveValue={liveValues[a.id]}
          />
        ))}
      </div>
    </div>
  );
}
