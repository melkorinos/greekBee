"use client";

// useElapsedClock — active-time clock for the Leksodromia decay scoring.
// Accumulates ms only while `running` is true AND the tab is visible
// (visibilitychange): backgrounding the tab or opening a pause/HowToPlay modal
// stops the decay, matching the generous-but-refresh-proof design.
//
// The reducer never reads this hook — components pass getElapsedMs() as the
// SUBMIT_WORD / SKIP_WORD payload, keeping game logic pure.

import { useCallback, useEffect, useRef, useState } from "react";

/** UI tick granularity for the live decaying-points counter. */
const TICK_MS = 250;

interface ElapsedClock {
  /** Coarse elapsed ms (updated ~4×/s) — for the live points display. */
  elapsedMs:    number;
  /** Exact elapsed ms at call time — for scoring on submit/skip. */
  getElapsedMs: () => number;
  /** Restart the clock; pass a base to resume a persisted elapsed. */
  reset:        (baseMs?: number) => void;
}

export function useElapsedClock(running: boolean): ElapsedClock {
  const accumulatedRef  = useRef(0);
  /** Timestamp of the last resume, or null while paused/hidden. */
  const runningSinceRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const getElapsedMs = useCallback(() => {
    const live = runningSinceRef.current === null ? 0 : Date.now() - runningSinceRef.current;
    return accumulatedRef.current + live;
  }, []);

  const reset = useCallback((baseMs = 0) => {
    accumulatedRef.current = baseMs;
    if (runningSinceRef.current !== null) runningSinceRef.current = Date.now();
    setElapsedMs(baseMs);
  }, []);

  useEffect(() => {
    const pause = () => {
      if (runningSinceRef.current === null) return;
      accumulatedRef.current += Date.now() - runningSinceRef.current;
      runningSinceRef.current = null;
      setElapsedMs(accumulatedRef.current);
    };
    const resume = () => {
      if (runningSinceRef.current !== null) return;
      runningSinceRef.current = Date.now();
    };

    const syncToVisibility = () => {
      if (running && document.visibilityState === "visible") resume();
      else pause();
    };

    syncToVisibility();
    document.addEventListener("visibilitychange", syncToVisibility);

    const interval = setInterval(() => {
      if (runningSinceRef.current !== null) {
        setElapsedMs(accumulatedRef.current + Date.now() - runningSinceRef.current);
      }
    }, TICK_MS);

    return () => {
      document.removeEventListener("visibilitychange", syncToVisibility);
      clearInterval(interval);
      pause(); // bank elapsed time when `running` flips or on unmount
    };
  }, [running]);

  return { elapsedMs, getElapsedMs, reset };
}
