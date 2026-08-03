"use client";

// useDayChange — redirects a stale daily Leksokipos page back to /leksokipos
// when the calendar day has rolled over.
//
// The daily URL is /leksokipos/[center]/[outer] — it encodes a letter set, not a
// date. A player who keeps the tab open (or bookmarks it) would otherwise stay on
// yesterday's puzzle forever. On mount and whenever the tab regains visibility we
// compare the puzzle's date to today and, if it is in the past, send the player to
// /leksokipos so the server can redirect them to today's puzzle.
//
// Custom puzzles (id starts with "custom-") are never date-bound, so they are skipped.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { isDailyPuzzle } from "@/games/leksokipos/lib";
import { todayISO } from "@/lib/puzzleDate";
import { useOfflineMode } from "@/hooks/useOfflineMode";

export function useDayChange(puzzle: LeksokiposPuzzle) {
  const router = useRouter();
  const { active: offlineActive } = useOfflineMode();

  // Set instead of redirecting while Offline Mode is on, so the board can explain
  // why the puzzle is stale rather than silently destroying the round.
  const [dayChangedWhileOffline, setDayChangedWhileOffline] = useState(false);

  useEffect(() => {
    if (!isDailyPuzzle(puzzle)) return;

    // If the puzzle is already from the past when the page mounts, the player
    // deliberately navigated here (e.g. via the leaderboard day strip).
    // Skip the redirect entirely — they should be able to play past puzzles.
    // The stale-tab case is covered below: a puzzle that was current at mount
    // will still be redirected via visibilitychange once the day rolls over.
    const mountDate = todayISO();
    if (puzzle.date < mountDate) return;

    function check() {
      // todayISO() is what getTodaysPuzzle() uses server-side, so client and server agree.
      if (puzzle.date >= todayISO()) return;

      // Offline Mode: /leksokipos is force-dynamic, so with no connection this
      // redirect would fail to load and take the round with it. Flag it and let the
      // player finish and unlock on their own terms.
      if (offlineActive) {
        setDayChangedWhileOffline(true);
        return;
      }

      router.replace("/leksokipos");
    }

    // Check whenever the user returns to the tab after a day has rolled over.
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [puzzle, router, offlineActive]);

  return { dayChangedWhileOffline };
}
