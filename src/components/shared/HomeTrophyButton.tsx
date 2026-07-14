"use client";

// HomeTrophyButton — 🏆 icon on landing-page game cards.
// Opens the per-game LeaderboardModal with full auth + profile support.
// One instance per applicable game card (leksokipos, leksiarxeio, leksindeseis,
// vrestifrasi, leksodromia, leksoplegma).

import { useState } from "react";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { setDisplayName as storeSetDisplayName } from "@/hooks/useGameStore";
import { getLast7Dates }                from "@/components/shared/LeaderboardModal";
import { btnHeaderIcon, btnHeaderIconSize } from "@/styles/recipes";
import { LeaderboardModal }             from "@/components/leksokipos/LeaderboardModal";
import { LeksiarxeioLeaderboardModal }  from "@/components/leksiarxeio/LeksiarxeioLeaderboardModal";
import { ConnectionsLeaderboardModal }  from "@/components/leksindeseis/ConnectionsLeaderboardModal";
import { VresTinFrasiLeaderboardModal } from "@/components/vrestifrasi/VresTinFrasiLeaderboardModal";
import { LeksodromiaLeaderboardModal }  from "@/components/leksodromia/LeksodromiaLeaderboardModal";
import { LeksoplegmaLeaderboardModal }  from "@/components/leksoplegma/LeksoplegmaLeaderboardModal";

type LeaderboardGameId =
  | "leksokipos"
  | "leksiarxeio"
  | "leksindeseis"
  | "vrestifrasi"
  | "leksodromia"
  | "leksoplegma";

interface HomeTrophyButtonProps {
  gameId: LeaderboardGameId;
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
  const recentDates = getLast7Dates(today);

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
        className={`${btnHeaderIconSize} ${btnHeaderIcon} text-trophy`}
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

      {gameId === "leksodromia" && (
        <LeksodromiaLeaderboardModal
          {...sharedProps}
          today={today}
        />
      )}

      {gameId === "leksoplegma" && (
        <LeksoplegmaLeaderboardModal
          {...sharedProps}
          today={today}
        />
      )}
    </>
  );
}
