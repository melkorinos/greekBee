// useLeaderboard — fetches and polls the leaderboard for a given puzzle date.
//
// Polling strategy:
//   - Fetch immediately when `enabled` becomes true or `puzzleId` changes.
//   - Re-fetch every 5 minutes while the browser tab is visible.
//   - Re-fetch when the tab regains visibility (returning from background).
//   - `enabled` flag lets callers pause polling when the UI is hidden (e.g. modal closed).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface LeaderboardRow {
  rank:         number;
  display_name: string;
  score:        number;
  isPlayer:     boolean;
}

export interface LeaderboardResponse {
  top20:      LeaderboardRow[];
  playerRow:  (Omit<LeaderboardRow, "isPlayer"> & { isPlayer: true }) | null;
}

const EMPTY: LeaderboardResponse = { top20: [], playerRow: null };

/**
 * Builds the fetch URL for the Spelling Bee leaderboard (default).
 * Pass a custom `buildUrl` to point the hook at a different endpoint
 * (e.g. Wordle: `/api/wordle-scores?date=`).
 */
export type LeaderboardUrlBuilder = (puzzleId: string, deviceId: string) => string;

const defaultBuildUrl: LeaderboardUrlBuilder = (puzzleId, deviceId) => {
  const params = new URLSearchParams({ puzzleId });
  if (deviceId) params.set("deviceId", deviceId);
  return `/api/scores?${params.toString()}`;
};

export function useLeaderboard(
  puzzleId:  string,
  deviceId:  string,
  enabled:   boolean = true,
  buildUrl:  LeaderboardUrlBuilder = defaultBuildUrl
) {
  const [data,      setData]      = useState<LeaderboardResponse>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep a stable loadData reference — updates when puzzleId / deviceId change.
  const loadData = useCallback(async () => {
    if (!puzzleId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl(puzzleId, deviceId));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as LeaderboardResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Σφάλμα φόρτωσης");
    } finally {
      setIsLoading(false);
    }
  }, [puzzleId, deviceId, buildUrl]);

  useEffect(() => {
    if (!enabled || !puzzleId) {
      // Clear data when disabled so stale results aren't shown on re-open.
      if (!enabled) setData(EMPTY);
      return;
    }

    // Fetch immediately on open / puzzle change.
    void loadData();

    // Poll every 5 minutes when the tab is visible.
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") void loadData();
    }, POLL_INTERVAL_MS);

    // Also re-fetch when the user switches back to the tab.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadData();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, puzzleId, loadData]);

  return { data, isLoading, error, refresh: loadData };
}
