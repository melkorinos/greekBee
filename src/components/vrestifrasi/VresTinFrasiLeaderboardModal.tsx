"use client";

// VresTinFrasi leaderboard — lower attempt count is better.
// Uses ascending score sort (sort=asc param on the API).

import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import { LeaderboardModalBase, getLast7Dates, buildLeaderboardUrl } from "@/components/shared/LeaderboardModal";
import { useLeaderboardProfileSlot } from "@/components/shared/LeaderboardProfileSlot";

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
  onClose,
  ...profile
}: VresTinFrasiLeaderboardModalProps) {
  const profileSlot = useLeaderboardProfileSlot({ displayName, ...profile });

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
      onClose={onClose}
      {...profileSlot}
    />
  );
}
