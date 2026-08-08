"use client";

// useProfileStats — the ONE read of GET /api/profile/stats for the Profile Page.
//
// Two panels ladder on this response: the lifetime-stats strip (cross-game points,
// puzzles, pangrams) and the Trophy Case (four badge lanes). Each used to fetch it
// itself, so opening /profile fired two identical round-trips — against the rule
// sync.ts already states for the game side ("never two stats fetches per mount").
// The page calls this once and hands the result down; the panels are pure display.
//
// Never throws and never blocks the page: a failed read comes back
// { stats: null, errored: true } and each panel degrades on its own terms — dashes
// in the strip, earned-facts-only lighting in the Trophy Case.

import { useEffect, useState } from "react";

const ENDPOINT = "/api/profile/stats";

/** The parsed GET /api/profile/stats body — the route documents how each is built. */
export interface ProfileStats {
  /** Cross-game lifetime points. */
  total_points:      number;
  /** Cross-game puzzles played. */
  puzzles_played:    number;
  /** Leksokipos-only points — the Συλλέκτης Πόντων lane. */
  leksokipos_points: number;
  /** Size of the append-only pangram set — the Κυνηγός Πανγκράμ lane. */
  pangram_count:     number;
  /** Days the top rank was reached — the Στην Κορυφή lane. */
  top_rank_count:    number;
  /** Days the found-word ratio was crossed — the Τζιμάνι lane. */
  tzimani_count:     number;
}

export interface ProfileStatsRead {
  /** The stats, or null while loading and after a failed read. */
  stats:   ProfileStats | null;
  /** True once the read has failed — lets a panel tell "loading" from "gave up". */
  errored: boolean;
}

/**
 * Read this device's lifetime stats once. An empty `deviceId` never fetches (the
 * page renders before identity hydrates), leaving the caller in its loading state.
 */
export function useProfileStats(deviceId: string): ProfileStatsRead {
  const [stats,   setStats]   = useState<ProfileStats | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    fetch(`${ENDPOINT}?device_uuid=${encodeURIComponent(deviceId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("stats fetch failed"))))
      .then((d: ProfileStats) => { if (!cancelled) setStats(d); })
      .catch(() => { if (!cancelled) setErrored(true); });
    return () => { cancelled = true; };
  }, [deviceId]);

  return { stats, errored };
}
