"use client";

// useAchievementSync — detects earned achievements from the live game snapshot
// and posts fresh ids to /api/achievements. Detection is pure (achievements.ts);
// this hook owns only the effects, the gating, the once-per-session dedup, and
// surfacing genuinely-new badges to the unlock toast.
//
// Rules:
//   - Daily puzzles only, never in god mode, and only with a known device id.
//   - One-shot lane runs whenever foundWords or rank changes; the lifetime-stats
//     lane reads points + pangram_count back once per mount (accept one-game lag
//     for points; pangram self-heal, ADR 0013); the pangram lane delta-posts newly
//     found pangrams and reads the crossing off the returned count (no lag).
//   - Posts each id at most once per session (a ref-tracked set); the server also
//     insert-if-absents, so a redundant post would be a harmless no-op anyway.
//   - The toast fires ONLY for badges not already earned before this session — we
//     fetch the earned-at-mount set and suppress anything already in it, so an old
//     badge never re-toasts on every visit. Detections that land before that set
//     loads are held pending and flushed once it arrives (race-safe).
//   - Fire-and-forget: earning never affects gameplay.

import { useCallback, useEffect, useRef } from "react";

import {
  describeAchievement,
  detectEarnedAchievements,
  detectEarnedPangramTiers,
  detectEarnedPointsTiers,
  type EarnedToast,
} from "@/games/leksokipos/lib/achievements";
import type { RankName } from "@/games/leksokipos/lib/ranking";
import {
  fetchEarnedAchievementIds,
  fetchLifetimeStats,
  postAchievements,
  postPangrams,
} from "@/games/leksokipos/sync";

interface UseAchievementSyncOptions {
  /**
   * Master switch — false makes the whole hook inert: no detection, no toasts, and
   * (crucially) no POSTs to /api/achievements or /api/pangrams. Defaults to true so
   * existing callers/tests are unchanged; GameBoard passes FEATURE_FLAGS.achievements
   * so the feature stays fully dark in prod until launch.
   */
  enabled?:       boolean;
  isDaily:        boolean;
  isGodMode:      boolean;
  /** Canonical device uuid (getOrCreateDeviceId). Empty string = skip. */
  deviceId:       string;
  foundWords:     string[];
  /** Pangram words found this round (GameBoard derives via isPangram; memoize it). */
  foundPangrams:  string[];
  /** ISO date of the active daily puzzle — the pangram rows' puzzle_date. */
  puzzleDate:     string;
  validWordCount: number;
  rank:           RankName;
  /** Fired once per genuinely-new badge (not earned before this session). */
  onAchievementEarned?: (badge: EarnedToast) => void;
}

export function useAchievementSync({
  enabled = true,
  isDaily,
  isGodMode,
  deviceId,
  foundWords,
  foundPangrams,
  puzzleDate,
  validWordCount,
  rank,
  onAchievementEarned,
}: UseAchievementSyncOptions): void {
  // Ids posted this session — guards against re-posting on every word/rank change.
  const postedRef = useRef<Set<string>>(new Set());
  // Pangram words already delta-posted this session — per-word, so each find posts once.
  const postedPangramWordsRef = useRef<Set<string>>(new Set());
  // Ids earned before this session (server truth at mount). null = not loaded yet.
  const earnedAtMountRef = useRef<Set<string> | null>(null);
  // Ids detected but not yet decidable for the toast (earned set still loading).
  const pendingRef = useRef<Set<string>>(new Set());
  // Ids already handed to the toast — surface each at most once.
  const toastedRef = useRef<Set<string>>(new Set());
  // Latest callback without re-subscribing the detection effects.
  const onEarnedRef = useRef(onAchievementEarned);
  useEffect(() => { onEarnedRef.current = onAchievementEarned; }, [onAchievementEarned]);

  // Decide pending ids against the earned-at-mount set: toast only the ones that
  // are genuinely new. No-op until the set has loaded (ids stay pending). Stable
  // (refs only) so the lanes can list it as a dependency without re-firing.
  const flushToasts = useCallback(() => {
    const earned = earnedAtMountRef.current;
    if (!earned) return;
    for (const id of [...pendingRef.current]) {
      pendingRef.current.delete(id);
      if (earned.has(id) || toastedRef.current.has(id)) continue;
      const display = describeAchievement(id);
      if (!display) continue;
      toastedRef.current.add(id);
      onEarnedRef.current?.({ id, ...display });
    }
  }, []);

  // Commit freshly-earned ids: skip anything already posted this session, mark the
  // rest, post them (insert-if-absent server-side), and queue them for the toast.
  // The single funnel every lane routes through — keeps the post/toast rules in one
  // place. deviceUuid is passed in (not closed over); stable so the lanes list it.
  const commitEarned = useCallback((deviceUuid: string, ids: string[]) => {
    const fresh = ids.filter((id) => !postedRef.current.has(id));
    if (fresh.length === 0) return;
    for (const id of fresh) {
      postedRef.current.add(id);
      pendingRef.current.add(id);
    }
    postAchievements({ deviceUuid, achievementIds: fresh });
    flushToasts();
  }, [flushToasts]);

  // Load the earned-at-mount set once, then flush anything already pending.
  useEffect(() => {
    if (!enabled || !isDaily || isGodMode || !deviceId) return;
    let cancelled = false;
    fetchEarnedAchievementIds(deviceId).then((ids) => {
      if (cancelled) return;
      earnedAtMountRef.current = new Set(ids);
      flushToasts();
    });
    return () => { cancelled = true; };
  }, [enabled, isDaily, isGodMode, deviceId, flushToasts]);

  // One-shot lane — detect on every foundWords/rank change, post fresh, queue for toast.
  useEffect(() => {
    if (!enabled || !isDaily || isGodMode || !deviceId) return;
    commitEarned(deviceId, detectEarnedAchievements({ isDaily, foundWords, validWordCount, rank }));
  // foundWords (array ref) changes on each valid submit; rank on each threshold cross.
  }, [enabled, foundWords, rank, isDaily, isGodMode, deviceId, validWordCount, commitEarned]);

  // Lifetime-stats lane (mount) — the crossings for both tiered badges depend on
  // LIFETIME values the client doesn't hold at end-of-game. One /api/profile/stats
  // read feeds BOTH: Συλλέκτης Πόντων (accept one-game lag — the just-finished score
  // may not be totalled yet, caught next mount) and the Κυνηγός Πανγκράμ self-heal
  // (posts any owed tier the pangram count already justifies, covering a crash/offline
  // gap between a pangram write and its tier POST). Both idempotent (ADR 0013).
  useEffect(() => {
    if (!enabled || !isDaily || isGodMode || !deviceId) return;
    let cancelled = false;
    fetchLifetimeStats(deviceId).then((stats) => {
      if (cancelled || !stats) return;
      if (stats.leksokipos_points !== null) commitEarned(deviceId, detectEarnedPointsTiers(stats.leksokipos_points));
      if (stats.pangram_count !== null) commitEarned(deviceId, detectEarnedPangramTiers(stats.pangram_count));
    });
    return () => { cancelled = true; };
  }, [enabled, isDaily, isGodMode, deviceId, commitEarned]);

  // Pangram-tier lane (Κυνηγός Πανγκράμ) — delta-post the pangrams found this session
  // that we haven't posted yet, and read the crossing off the returned lifetime count
  // (no lag: the POST just inserted them). Per-word ref → each find posts once; a
  // failed POST is re-derived from foundWords on a later mount of the still-current
  // puzzle (R6). foundPangrams must be memoized by the caller (referential stability).
  useEffect(() => {
    if (!enabled || !isDaily || isGodMode || !deviceId) return;
    const unposted = foundPangrams.filter((w) => !postedPangramWordsRef.current.has(w));
    if (unposted.length === 0) return;
    for (const w of unposted) postedPangramWordsRef.current.add(w);

    let cancelled = false;
    postPangrams({ deviceUuid: deviceId, puzzleDate, words: unposted }).then((count) => {
      if (cancelled || count === null) return;
      commitEarned(deviceId, detectEarnedPangramTiers(count));
    });
    return () => { cancelled = true; };
  }, [enabled, foundPangrams, puzzleDate, isDaily, isGodMode, deviceId, commitEarned]);
}
