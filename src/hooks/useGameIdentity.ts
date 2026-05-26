"use client";

// useGameIdentity — SSR-safe initialisation of DeviceId and DisplayName for game boards.
//
// Interface: { deviceId, displayName, setDeviceId, setDisplayName }
//
// Hides:
//   - "typeof window === 'undefined'" guard (safe to call on the server; returns empty strings)
//   - First-call UUID creation via getOrCreateDeviceId()
//   - Reading the persisted display name from the unified envelope

import { getDisplayName, getOrCreateDeviceId } from "@/hooks/useGameStore";
import { useState } from "react";

export function useGameIdentity() {
  const [deviceId, setDeviceId] = useState<string>(
    () => typeof window === "undefined" ? "" : getOrCreateDeviceId(),
  );
  const [displayName, setDisplayName] = useState<string>(
    () => typeof window === "undefined" ? "" : getDisplayName(),
  );

  return { deviceId, displayName, setDeviceId, setDisplayName };
}
