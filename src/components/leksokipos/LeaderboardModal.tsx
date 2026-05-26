"use client";

// LeaderboardModal — Leksokipos leaderboard wrapper.
//
// Wires the shared LeaderboardModalBase with:
//   - Amber colour scheme
//   - Server-provided recentDates for the day strip
//   - Profile section (topSlot)
//   - "Παίξε αυτό το παζλ" footer link for past dates

import type { ProfileMatch, ProfileSectionProps } from "./ProfileSection";
import { LeaderboardModalBase } from "@/components/shared/LeaderboardModal";
import Link from "next/link";
import { ProfileSection } from "./ProfileSection";

export type { ProfileMatch };

// ── Props ─────────────────────────────────────────────────────────────────────

interface LeaderboardModalProps extends ProfileSectionProps {
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
  profilePin,
  onSaveName,
  onProfileCreate,
  onProfileLinked,
  onProfileRestore,
  onProfileSelect,
  onDisconnect,
  onClose,
}: LeaderboardModalProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <LeaderboardModalBase
      isOpen={isOpen}
      today={today}
      deviceId={deviceId}
      displayName={displayName}
      dates={recentDates}
      defaultDate={defaultPuzzleId}
      buildUrl={(puzzleId, dId) => {
        const params = new URLSearchParams({ game_id: "leksokipos", puzzle_date: puzzleId });
        if (dId) params.set("deviceId", dId);
        return `/api/game-scores?${params.toString()}`;
      }}
      pillActive="bg-amber-400 text-amber-900"
      playerMark="text-amber-500"
      showNameEditor={!profileLinked}
      topSlot={
        <ProfileSection
          profileLinked={profileLinked}
          profilePin={profilePin}
          displayName={displayName}
          onProfileCreate={onProfileCreate}
          onProfileLinked={onProfileLinked}
          onProfileRestore={onProfileRestore}
          onProfileSelect={onProfileSelect}
          onDisconnect={onDisconnect}
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
      onSaveName={onSaveName}
      onClose={onClose}
    />
  );
}
