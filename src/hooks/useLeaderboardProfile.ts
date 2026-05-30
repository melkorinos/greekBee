"use client";

// useLeaderboardProfile — shared profile-aware save logic for leaderboard modals.
//
// When the player is unlinked, "Αποθήκευση" creates a profile (not just saves name).
// When linked, it updates the display name locally.
// All three game leaderboard modals use this hook to avoid duplicating the logic.

import { useState } from "react";

// ── Shared profile prop type (accepted by all three game leaderboard modals) ──

export interface LeaderboardProfileProps {
  profileLinked:        boolean;
  onProfileCreate:      (name: string) => Promise<void>;
  onTransferGenerate:   () => Promise<string>;
  onTransferClaim:      (code: string) => Promise<void>;
  onDisconnect:         () => void;
  /** Optional Google auth — passed through to ProfileSection. */
  authLinked?:          boolean;
  authUserName?:        string | null;
  onSignIn?:            () => Promise<void>;
  onSignOut?:           () => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLeaderboardProfile({
  profileLinked,
  onProfileCreate,
  onSaveName,
}: {
  profileLinked:   boolean;
  onProfileCreate: (name: string) => Promise<void>;
  onSaveName:      (name: string) => void;
}) {
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleSave(name: string) {
    if (!profileLinked) {
      setCreateError(null);
      try {
        await onProfileCreate(name);
      } catch {
        setCreateError("Παρουσιάστηκε σφάλμα. Δοκίμασε ξανά.");
      }
    } else {
      onSaveName(name);
    }
  }

  return { createError, handleSave };
}
