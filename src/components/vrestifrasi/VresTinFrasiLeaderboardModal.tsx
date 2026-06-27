"use client";

// VresTinFrasi leaderboard — lower attempt count is better.
// Uses ascending score sort (sort=asc param on the API).

import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import type { LeaderboardUrlBuilder } from "@/hooks/useLeaderboard";
import { LeaderboardModalBase } from "@/components/shared/LeaderboardModal";
import { ProfileSection } from "@/components/shared/ProfileSection";
import { useLeaderboardProfile } from "@/hooks/useLeaderboardProfile";

function getLast7Dates(today: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// sort=asc so the leaderboard endpoint orders by ascending score (fewer guesses = better rank)
const buildUrl: LeaderboardUrlBuilder = (date, deviceId) => {
  const params = new URLSearchParams({ game_id: "vrestifrasi", puzzle_date: date, sort: "asc" });
  if (deviceId) params.set("deviceId", deviceId);
  return `/api/game-scores?${params.toString()}`;
};

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
