"use client";

// ConnectionsLeaderboardModal — leaderboard for daily Leksindeseis Puzzles.
//
// Wires the shared LeaderboardModalBase with:
//   - Purple colour scheme
//   - Single-date strip (Connections has no rolling history UI)
//   - Score formatted as "X/4" (mistakesRemaining; higher = better)

import type { LeaderboardUrlBuilder } from "@/hooks/useLeaderboard";
import { LeaderboardModalBase } from "@/components/shared/LeaderboardModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildUrl: LeaderboardUrlBuilder = (date, deviceId) => {
  const params = new URLSearchParams({ game_id: "leksindeseis", puzzle_date: date });
  if (deviceId) params.set("deviceId", deviceId);
  return `/api/game-scores?${params.toString()}`;
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface ConnectionsLeaderboardModalProps {
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
  onSaveName,
  onClose,
}: ConnectionsLeaderboardModalProps) {
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
      pillActive="bg-purple-500 text-white"
      playerMark="text-purple-600 dark:text-purple-400"
      onSaveName={onSaveName}
      onClose={onClose}
    />
  );
}
