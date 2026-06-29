"use client";

// ConnectionsLeaderboardModal — leaderboard for daily Leksindeseis Puzzles.
//
// Wires the shared LeaderboardModalBase with:
//   - Purple colour scheme
//   - Single-date strip (Leksindeseis has no rolling history UI)
//   - Score formatted as "X/4" (mistakesRemaining; higher = better)
//   - Shared ProfileSection (topSlot)

import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import { LeaderboardModalBase, buildLeaderboardUrl } from "@/components/shared/LeaderboardModal";
import { ProfileSection } from "@/components/shared/ProfileSection";
import { useLeaderboardProfile } from "@/hooks/useLeaderboardProfile";

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
}: ConnectionsLeaderboardModalProps) {
  const { createError, handleSave } = useLeaderboardProfile({
    profileLinked,
    onProfileCreate,
    onSaveName,
  });

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
