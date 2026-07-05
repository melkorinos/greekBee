"use client";

// useAchievementSync — detects earned achievements from the live game snapshot
// and posts fresh ids to /api/achievements. Detection is pure (achievements.ts);
// this hook owns only the effect, the gating, and the once-per-session dedup.
//
// Rules:
//   - Daily puzzles only, never in god mode, and only with a known device id.
//   - Runs whenever foundWords or rank changes — the signals the predicates read.
//   - Posts each id at most once per session (a ref-tracked set); the server also
//     insert-if-absents, so a redundant post would be a harmless no-op anyway.
//   - Fire-and-forget: earning never affects gameplay.

import { useEffect, useRef } from "react";

import { detectEarnedAchievements } from "@/games/leksokipos/lib/achievements";
import type { RankName } from "@/games/leksokipos/lib/ranking";
import { postAchievements } from "@/games/leksokipos/sync";

interface UseAchievementSyncOptions {
  isDaily:        boolean;
  isGodMode:      boolean;
  /** Canonical device uuid (getOrCreateDeviceId). Empty string = skip. */
  deviceId:       string;
  foundWords:     string[];
  validWordCount: number;
  rank:           RankName;
}

export function useAchievementSync({
  isDaily,
  isGodMode,
  deviceId,
  foundWords,
  validWordCount,
  rank,
}: UseAchievementSyncOptions): void {
  // Ids posted this session — guards against re-posting on every word/rank change.
  const postedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isDaily || isGodMode || !deviceId) return;

    const earned = detectEarnedAchievements({ isDaily, foundWords, validWordCount, rank });
    const fresh = earned.filter((id) => !postedRef.current.has(id));
    if (fresh.length === 0) return;

    for (const id of fresh) postedRef.current.add(id);
    postAchievements({ deviceUuid: deviceId, achievementIds: fresh });
  // foundWords (array ref) changes on each valid submit; rank on each threshold cross.
  }, [foundWords, rank, isDaily, isGodMode, deviceId, validWordCount]);
}
