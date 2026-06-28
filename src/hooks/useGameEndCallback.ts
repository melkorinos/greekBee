"use client";

import { useEffect, useRef } from "react";

/**
 * Fires `onGameEnd` exactly once when `status` transitions away from "playing".
 * Uses a ref so the effect never re-fires for the same transition.
 */
export function useGameEndCallback(
  status:     string,
  guessCount: number,
  onGameEnd:  ((attempts: number, won: boolean) => void) | undefined,
): void {
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === "playing" && status !== "playing") {
      onGameEnd?.(guessCount, status === "won");
    }
    prevStatusRef.current = status;
  }, [status, guessCount, onGameEnd]);
}
