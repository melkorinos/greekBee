"use client";

// LeksiarxeioLeaderboardModal — Leksiarxeio leaderboard wrapper.
//
// Wires the shared LeaderboardModalBase with:
//   - Green colour scheme
//   - Client-computed 7-day strip
//   - /api/leksiarxeio-scores endpoint (date= param)
//   - "Προσπάθειες" score column
//   - Shared ProfileSection (topSlot)

import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import type { LeaderboardUrlBuilder } from "@/hooks/useLeaderboard";
import { LeaderboardModalBase } from "@/components/shared/LeaderboardModal";
import { ProfileSection } from "@/components/shared/ProfileSection";
import { useLeaderboardProfile } from "@/hooks/useLeaderboardProfile";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLast7Dates(today: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

const buildUrl: LeaderboardUrlBuilder = (date, deviceId) => {
  const params = new URLSearchParams({ date });
  if (deviceId) params.set("deviceId", deviceId);
  return `/api/leksiarxeio-scores?${params.toString()}`;
};

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
  profileLinked,
  onSaveName,
  onProfileCreate,
  onTransferGenerate,
  onTransferClaim,
  onDisconnect,
  onClose,
}: LeksiarxeioLeaderboardModalProps) {
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
      subtitle="Άθροισμα προσπαθειών (4–8 γράμματα) · χαμηλότερο = καλύτερο"
      scoreLabel="Προσπάθειες"
      pillActive="bg-green-500 text-white"
      playerMark="text-green-600"
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
        />
      }
      onSaveName={(name) => void handleSave(name)}
      onClose={onClose}
    />
  );
}
