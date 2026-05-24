"use client";

// useProfileVerification — startup guard for stale cross-device profiles.
//
// If profileLinked=true but the player_profiles row was deleted (e.g. a DB
// purge), the client is stuck in a "linked" state with no logout button.
// This hook detects that on mount and silently calls onDisconnect() so the
// player is downgraded to anonymous and can re-create a profile if they want.
//
// Conservative error handling: network errors and server 500s are silently
// ignored — we never disconnect a user just because the server is unreachable.

import { useEffect } from "react";

interface UseProfileVerificationOptions {
  profileLinked: boolean;
  deviceId:      string;
  onDisconnect:  () => void;
}

export function useProfileVerification({
  profileLinked,
  deviceId,
  onDisconnect,
}: UseProfileVerificationOptions): void {
  useEffect(() => {
    if (!profileLinked || !deviceId) return;

    let cancelled = false;

    fetch(`/api/profile?device_uuid=${encodeURIComponent(deviceId)}`)
      .then((res) => {
        if (!res.ok || cancelled) return;
        return res.json() as Promise<{ exists: boolean }>;
      })
      .then((json) => {
        if (!cancelled && json && json.exists === false) {
          onDisconnect();
        }
      })
      .catch(() => {
        // Network error — assume still linked, do not disconnect offline users.
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only
}
