"use client";

// HomeTrophyButton — 🏆 icon on landing-page game cards.
// Opens the per-game LeaderboardModal with full auth + profile support.
// One instance per applicable game card (leksokipos, leksiarxeio, leksindeseis, vrestifrasi).

import { useState } from "react";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { setDisplayName as storeSetDisplayName } from "@/hooks/useGameStore";
import { LeaderboardModal }             from "@/components/leksokipos/LeaderboardModal";
import { LeksiarxeioLeaderboardModal }  from "@/components/leksiarxeio/LeksiarxeioLeaderboardModal";
import { ConnectionsLeaderboardModal }  from "@/components/leksindeseis/ConnectionsLeaderboardModal";
import { VresTinFrasiLeaderboardModal } from "@/components/vrestifrasi/VresTinFrasiLeaderboardModal";

type LeaderboardGameId = "leksokipos" | "leksiarxeio" | "leksindeseis" | "vrestifrasi";

interface HomeTrophyButtonProps {
  gameId: LeaderboardGameId;
}

function getLast7Dates(): string[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

export function HomeTrophyButton({ gameId }: HomeTrophyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { deviceId, displayName, setDeviceId, setDisplayName } = useGameIdentity();
  const { authLinked, authUserName, signInWithGoogle, signOut } = useAuth();

  const {
    profileLinked,
    createProfile,
    generateTransferCode,
    claimTransferCode,
    disconnect,
  } = useProfile({
    deviceId,
    onDeviceIdChange:    setDeviceId,
    onDisplayNameChange: setDisplayName,
  });

  function handleSaveName(name: string) {
    const trimmed = name.trim() || "Ανώνυμος";
    storeSetDisplayName(trimmed);
    setDisplayName(trimmed);
  }

  const today       = new Date().toISOString().slice(0, 10);
  const recentDates = getLast7Dates();

  const sharedProps = {
    isOpen,
    deviceId,
    displayName,
    profileLinked,
    authLinked,
    authUserName,
    onProfileCreate:    createProfile,
    onTransferGenerate: generateTransferCode,
    onTransferClaim:    claimTransferCode,
    onDisconnect:       disconnect,
    onSignIn:           signInWithGoogle,
    onSignOut:          signOut,
    onSaveName:         handleSaveName,
    onClose:            () => setIsOpen(false),
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Πίνακας Σκορ"
        title="Πίνακας Σκορ"
        className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface-raised transition-colors text-trophy leading-none"
      >
        🏆
      </button>

      {gameId === "leksokipos" && (
        <LeaderboardModal
          {...sharedProps}
          defaultPuzzleId={today}
          recentDates={recentDates}
        />
      )}

      {gameId === "leksiarxeio" && (
        <LeksiarxeioLeaderboardModal
          {...sharedProps}
          today={today}
        />
      )}

      {gameId === "leksindeseis" && (
        <ConnectionsLeaderboardModal
          {...sharedProps}
          date={today}
          score={0}
        />
      )}

      {gameId === "vrestifrasi" && (
        <VresTinFrasiLeaderboardModal
          {...sharedProps}
          today={today}
        />
      )}
    </>
  );
}
