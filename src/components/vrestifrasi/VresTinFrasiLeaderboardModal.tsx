"use client";

// VresTinFrasi leaderboard — lower attempt count is better.
// Uses ascending score sort (sort=asc param on the API).

import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import { LeaderboardModalBase, getLast7Dates, buildLeaderboardUrl } from "@/components/shared/LeaderboardModal";
import { ProfileSection } from "@/components/shared/ProfileSection";
import { useLeaderboardProfile } from "@/hooks/useLeaderboardProfile";

// sort=asc so the leaderboard endpoint orders by ascending score (fewer guesses = better rank)
const buildUrl = buildLeaderboardUrl("vrestifrasi", { sort: "asc" });

interface VresTinFrasiLeaderboardModalProps extends LeaderboardProfileProps {
  isOpen:      boolean;
  today:       string;
  deviceId:    string;
  displayName: string;
  onSaveName:  (name: string) => void;
  onClose:     () => void;
}

export function VresTinFrasiLeaderboardModal({
  isOpen,
  today,
  deviceId,
  displayName,
  profileLinked,
  onSaveName,
  onProfileCreate,
  onTransferGenerate,
  onTransferClaim,
  onDisconnect,
  authLinked,
  authUserName,
  onSignIn,
  onSignOut,
  onClose,
}: VresTinFrasiLeaderboardModalProps) {
  const { createError, handleSave } = useLeaderboardProfile({
    profileLinked,
    onProfileCreate,
    onSaveName,
  });

  return (
    <LeaderboardModalBase
      isOpen={isOpen}
      today={today}
      deviceId={deviceId}
      displayName={displayName}
      dates={getLast7Dates(today)}
      defaultDate={today}
      buildUrl={buildUrl}
      subtitle="Αριθμός προσπαθειών · χαμηλότερο = καλύτερο"
      scoreLabel="Προσπάθειες"
      pillActive="bg-misplaced text-white"
      playerMark="text-purple-600"
      showNameEditor={true}
      saveButtonAlwaysActive={!profileLinked}
      topSlot={
        <ProfileSection
          profileLinked={profileLinked}
          displayName={displayName}
          createError={createError ?? undefined}
          onTransferGenerate={onTransferGenerate}
          onTransferClaim={onTransferClaim}
          onDisconnect={onDisconnect}
          authLinked={authLinked}
          authUserName={authUserName}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          onSaveName={(name) => void handleSave(name)}
        />
      }
      onSaveName={(name) => void handleSave(name)}
      onClose={onClose}
    />
  );
}
