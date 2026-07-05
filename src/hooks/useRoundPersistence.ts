"use client";

// useRoundPersistence — unified persistence hook for a single game round.
// Replaces the three incompatible persistence implementations across
// Leksokipos, Leksiarxeio, and Leksindeseis with one consistent seam.
//
// Storage format: { [sessionKey]: TSnapshot } under the game's slice.
// Multiple sessions co-exist (e.g. different Leksiarxeio word lengths on the same day).

import { clearSlice, readSlice, writeSlice } from "./useGameStore";
import { useCallback, useEffect, useRef } from "react";

import type { SliceId } from "@/types";

type SessionStore<T> = Record<string, T>;

/**
 * Persists and restores a single game round's state.
 *
 * - After mount (or when sessionKey changes): reads the saved snapshot for this
 *   sessionKey and calls onRestore if found. Never runs during SSR.
 * - Whenever snapshot changes: writes it to localStorage (gated by shouldSave).
 * - Returns clear(): removes only this session from the slice.
 *
 * Callers must memoize `snapshot` (via useMemo) so the save effect only fires
 * when the persisted fields actually change.
 *
 * @param gameId      - Which game slice to read/write
 * @param sessionKey  - Unique identifier for this round (puzzle ID or date)
 * @param snapshot    - Memoized state to persist; triggers a save on reference change
 * @param onRestore   - Called once with the saved snapshot when session matches
 * @param shouldSave  - Optional guard; returning false skips the write
 */
export function useRoundPersistence<TSnapshot>(
  gameId: SliceId,
  sessionKey: string,
  snapshot: TSnapshot,
  onRestore: (saved: TSnapshot) => void,
  shouldSave?: (snap: TSnapshot) => boolean,
): () => void {
  // Keep callbacks current without adding them to effect deps
  const onRestoreRef = useRef(onRestore);
  useEffect(() => { onRestoreRef.current = onRestore; });

  const shouldSaveRef = useRef(shouldSave);
  useEffect(() => { shouldSaveRef.current = shouldSave; });

  // Hydrate on mount and whenever the active session switches
  useEffect(() => {
    try {
      const store = readSlice<SessionStore<TSnapshot>>(gameId);
      const saved = store?.[sessionKey];
      if (saved !== undefined) onRestoreRef.current(saved);
    } catch {
      // Corrupt data — start fresh
    }
  }, [gameId, sessionKey]);

  // Persist whenever the memoized snapshot changes
  useEffect(() => {
    if (shouldSaveRef.current && !shouldSaveRef.current(snapshot)) return;
    try {
      const existing = readSlice<SessionStore<TSnapshot>>(gameId) ?? {};
      writeSlice(gameId, { ...existing, [sessionKey]: snapshot });
    } catch {
      // localStorage unavailable (private browsing, storage full) — game still works
    }
    // snapshot is the only dep: callers control frequency via useMemo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  return useCallback(() => {
    try {
      const existing = readSlice<SessionStore<TSnapshot>>(gameId) ?? {};
      const updated = { ...existing };
      delete updated[sessionKey];
      if (Object.keys(updated).length === 0) {
        clearSlice(gameId);
      } else {
        writeSlice(gameId, updated);
      }
    } catch {
      // ignore
    }
  }, [gameId, sessionKey]);
}
