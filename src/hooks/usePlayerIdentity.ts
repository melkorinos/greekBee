"use client";

// usePlayerIdentity — the single identity module every leaderboard-bearing surface
// composes. It owns, in one place:
//   • the one-time Leksiarxeio identity migration, run BEFORE the device id is read
//     (an ordering constraint that used to be copied verbatim into four boards);
//   • the three identity hooks — useGameIdentity + useProfile + useAuth;
//   • the name-save composition (React state + persisted store) shared by the
//     in-game name editor and the create/claim flows.
//
// It returns the scalar identity fields plus `leaderboardProps` — the exact bundle
// a game LeaderboardModal needs — so a surface spreads one object instead of
// threading twelve profile/auth props (twice, once per render branch).
//
// Scope note: this module deliberately owns NO per-game name-change side effect.
// Leksokipos and Leksindeseis re-post their score when the display name changes,
// and that re-post reads a useScoreSubmission hook which in turn needs THIS module's
// deviceId — so their wiring is genuinely `identity → score submission → profile`,
// an interleave a single bundled hook can't linearise. Those two boards keep their
// explicit hook assembly; every side-effect-free surface uses this module.

import { setDisplayName as saveDisplayName, migrateLeksiarxeioIdentity } from "@/hooks/useGameStore";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import { useCallback } from "react";

/** The exact identity bundle a game LeaderboardModal consumes — spread it in. */
export type PlayerIdentityLeaderboardProps = LeaderboardProfileProps & {
  deviceId:    string;
  displayName: string;
  onSaveName:  (name: string) => void;
};

export interface PlayerIdentity {
  deviceId:             string;
  displayName:          string;
  profileLinked:        boolean;
  authLinked:           boolean;
  authUserName:         string | null;
  createProfile:        (name: string) => Promise<void>;
  generateTransferCode: () => Promise<string>;
  claimTransferCode:    (code: string) => Promise<void>;
  disconnect:           () => void;
  signInWithGoogle:     () => Promise<void>;
  signOut:              () => Promise<void>;
  /** Persist a name typed in an editor: React state + the unified store. */
  saveName:             (name: string) => void;
  /** One bundle for any game LeaderboardModal — replaces 12 threaded props. */
  leaderboardProps:     PlayerIdentityLeaderboardProps;
}

export function usePlayerIdentity(): PlayerIdentity {
  // Must run before useGameIdentity reads the device id, so an existing player's
  // legacy Leksiarxeio UUID is promoted before getOrCreateDeviceId can mint a fresh
  // one. Idempotent — safe on every render. (Was copied into four boards.)
  if (typeof window !== "undefined") migrateLeksiarxeioIdentity();

  const { deviceId, displayName, setDeviceId, setDisplayName } = useGameIdentity();

  // The one place a name lands: local React state + the unified store. Used both by
  // the create/claim flows (via useProfile's onDisplayNameChange) and by the in-game
  // name editor (via leaderboardProps.onSaveName). The store write is idempotent with
  // the write useProfile already performs on create/claim.
  const saveName = useCallback((name: string) => {
    setDisplayName(name);
    saveDisplayName(name);
  }, [setDisplayName]);

  const {
    profileLinked,
    createProfile,
    generateTransferCode,
    claimTransferCode,
    disconnect,
  } = useProfile({
    deviceId,
    onDeviceIdChange:    setDeviceId,
    onDisplayNameChange: saveName,
  });

  const { authLinked, authUserName, signInWithGoogle, signOut } = useAuth();

  return {
    deviceId,
    displayName,
    profileLinked,
    authLinked,
    authUserName,
    createProfile,
    generateTransferCode,
    claimTransferCode,
    disconnect,
    signInWithGoogle,
    signOut,
    saveName,
    leaderboardProps: {
      deviceId,
      displayName,
      profileLinked,
      onSaveName:         saveName,
      onProfileCreate:    createProfile,
      onTransferGenerate: generateTransferCode,
      onTransferClaim:    claimTransferCode,
      onDisconnect:       disconnect,
      authLinked,
      authUserName,
      onSignIn:           signInWithGoogle,
      onSignOut:          signOut,
    },
  };
}
