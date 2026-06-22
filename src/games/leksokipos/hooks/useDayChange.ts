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

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { isDailyPuzzle } from "@/games/leksokipos/lib";

export function useDayChange(puzzle: LeksokiposPuzzle) {
  const router = useRouter();

  useEffect(() => {
    if (!isDailyPuzzle(puzzle)) return;

    function check() {
      // Matches getTodaysPuzzle() server-side (UTC date), so client and server agree.
      const today = new Date().toISOString().split("T")[0];
      if (puzzle.date < today) {
        router.replace("/leksokipos");
      }
    }

    // Check on mount (covers a cached page served the next day).
    check();

    // Check whenever the user returns to the tab.
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [puzzle, router]);
}
