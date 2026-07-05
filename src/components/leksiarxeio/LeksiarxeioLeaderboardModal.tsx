"use client";

// LeksiarxeioLeaderboardModal — Leksiarxeio leaderboard wrapper.
//
// Wires the shared LeaderboardModalBase with:
//   - Client-computed 7-day strip
//   - /api/leksiarxeio-scores endpoint (date= param)
//   - "Σκορ" score column
//   - Shared profile slot (useLeaderboardProfileSlot)

import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import { LeaderboardModalBase, getLast7Dates, buildLeaderboardUrl } from "@/components/shared/LeaderboardModal";
import { useLeaderboardProfileSlot } from "@/components/shared/LeaderboardProfileSlot";

const buildUrl = buildLeaderboardUrl("leksiarxeio");

// ── Props ─────────────────────────────────────────────────────────────────────

interface LeksiarxeioLeaderboardModalProps extends LeaderboardProfileProps {
  isOpen:      boolean;
  today:       string;
  deviceId:    string;
  displayName: string;
  onSaveName:  (name: string) => void;
  onClose:     () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LeksiarxeioLeaderboardModal({
  isOpen,
  today,
  deviceId,
  displayName,
  onClose,
  ...profile
}: LeksiarxeioLeaderboardModalProps) {
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
      subtitle="Άθροισμα σκορ (4–8 γράμματα) · υψηλότερο = καλύτερο"
      scoreLabel="Σκορ"
      onClose={onClose}
      {...profileSlot}
    />
  );
}
