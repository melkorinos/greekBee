"use client";

// LeaderboardModal — Leksokipos leaderboard wrapper.
//
// Wires the shared LeaderboardModalBase with:
//   - Amber colour scheme
//   - Server-provided recentDates for the day strip
//   - Shared ProfileSection (topSlot)
//   - "Παίξε αυτό το παζλ" footer link for past dates

import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import { LeaderboardModalBase, buildLeaderboardUrl } from "@/components/shared/LeaderboardModal";
import { ProfileSection } from "@/components/shared/ProfileSection";
import Link from "next/link";
import { useLeaderboardProfile } from "@/hooks/useLeaderboardProfile";

const buildUrl = buildLeaderboardUrl("leksokipos");

// ── Props ─────────────────────────────────────────────────────────────────────

interface LeaderboardModalProps extends LeaderboardProfileProps {
  isOpen:          boolean;
  defaultPuzzleId: string;
  recentDates:     string[];
  deviceId:        string;
  displayName:     string;
  onSaveName:      (name: string) => void;
  onClose:         () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LeaderboardModal({
  isOpen,
  defaultPuzzleId,
  recentDates,
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
}: LeaderboardModalProps) {
  const today = new Date().toISOString().split("T")[0];
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
      dates={recentDates}
      defaultDate={defaultPuzzleId}
      buildUrl={buildUrl}
      pillActive="bg-amber-400 text-amber-900"
      playerMark="text-amber-500"
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
      emptySlot={(date) =>
        date < today ? (
          <Link
            href={`/leksokipos?puzzle=${date}`}
            className="text-stone-600 text-sm underline hover:text-stone-800"
          >
            Παίξε αυτό το παζλ →
          </Link>
        ) : null
      }
      footerSlot={(date) =>
        date < today ? (
          <Link
            href={`/leksokipos?puzzle=${date}`}
            onClick={onClose}
            className="text-sm text-stone-600 underline hover:text-stone-800 transition-colors"
          >
            Παίξε αυτό το παζλ →
          </Link>
        ) : null
      }
      onSaveName={(name) => void handleSave(name)}
      onClose={onClose}
    />
  );
}
