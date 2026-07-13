"use client";

// Leksodromia leaderboard — higher score is better (default descending sort).

import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import { LeaderboardModalBase, buildLeaderboardUrl, getLast7Dates } from "@/components/shared/LeaderboardModal";
import { useLeaderboardProfileSlot } from "@/components/shared/LeaderboardProfileSlot";

const buildUrl = buildLeaderboardUrl("leksodromia");

interface LeksodromiaLeaderboardModalProps extends LeaderboardProfileProps {
  isOpen:      boolean;
  today:       string;
  deviceId:    string;
  displayName: string;
  onSaveName:  (name: string) => void;
  onClose:     () => void;
}

export function LeksodromiaLeaderboardModal({
  isOpen,
  today,
  deviceId,
  displayName,
  onClose,
  ...profile
}: LeksodromiaLeaderboardModalProps) {
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
      subtitle="Πόντοι ημέρας · υψηλότερο = καλύτερο"
      scoreLabel="Πόντοι"
      onClose={onClose}
      {...profileSlot}
    />
  );
}
