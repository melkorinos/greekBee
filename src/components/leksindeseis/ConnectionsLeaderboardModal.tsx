"use client";

// ConnectionsLeaderboardModal — leaderboard for daily Leksindeseis Puzzles.
//
// Wires the shared LeaderboardModalBase with:
//   - Single-date strip (Leksindeseis has no rolling history UI)
//   - Score formatted as "X/4" (mistakesRemaining; higher = better)
//   - Shared profile slot (useLeaderboardProfileSlot)

import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import { LeaderboardModalBase, buildLeaderboardUrl } from "@/components/shared/LeaderboardModal";
import { useLeaderboardProfileSlot } from "@/components/shared/LeaderboardProfileSlot";

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildUrl = buildLeaderboardUrl("leksindeseis");

// ── Props ─────────────────────────────────────────────────────────────────────

interface ConnectionsLeaderboardModalProps extends LeaderboardProfileProps {
  isOpen:      boolean;
  date:        string;   // YYYY-MM-DD
  deviceId:    string;
  displayName: string;
  score:       number;   // 0 when still playing / lost; 1–4 when won
  onSaveName:  (name: string) => void;
  onClose:     () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConnectionsLeaderboardModal({
  isOpen,
  date,
  deviceId,
  displayName,
  score,
  onClose,
  ...profile
}: ConnectionsLeaderboardModalProps) {
  const profileSlot = useLeaderboardProfileSlot({ displayName, ...profile });

  return (
    <LeaderboardModalBase
      isOpen={isOpen}
      title="🏆 Κατάταξη"
      subtitle={score > 0 ? `Σκορ σου: ${score}/4` : undefined}
      today={date}
      dates={[date]}
      defaultDate={date}
      deviceId={deviceId}
      displayName={displayName}
      buildUrl={buildUrl}
      scoreLabel="Σκορ"
      formatScore={(n) => `${n}/4`}
      onClose={onClose}
      {...profileSlot}
    />
  );
}
