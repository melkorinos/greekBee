"use client";

// LeksiarxeioLeaderboardModal — Leksiarxeio leaderboard wrapper.
//
// Wires the shared LeaderboardModalBase with:
//   - Green colour scheme
//   - Client-computed 7-day strip
//   - /api/leksiarxeio-scores endpoint (date= param)
//   - "Σκορ" score column
//   - Shared ProfileSection (topSlot)

import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import { LeaderboardModalBase, getLast7Dates, buildLeaderboardUrl } from "@/components/shared/LeaderboardModal";
import { ProfileSection } from "@/components/shared/ProfileSection";
import { useLeaderboardProfile } from "@/hooks/useLeaderboardProfile";

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
      subtitle="Άθροισμα σκορ (4–8 γράμματα) · υψηλότερο = καλύτερο"
      scoreLabel="Σκορ"
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
