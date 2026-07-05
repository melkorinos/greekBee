"use client";

// LeaderboardModal — Leksokipos leaderboard wrapper.
//
// Wires the shared LeaderboardModalBase with:
//   - Server-provided recentDates for the day strip
//   - Shared profile slot (useLeaderboardProfileSlot)
//   - "Παίξε αυτό το παζλ" footer link for past dates

import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import { LeaderboardModalBase, buildLeaderboardUrl } from "@/components/shared/LeaderboardModal";
import { useLeaderboardProfileSlot } from "@/components/shared/LeaderboardProfileSlot";
import Link from "next/link";

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
  onClose,
  ...profile
}: LeaderboardModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const profileSlot = useLeaderboardProfileSlot({ displayName, ...profile });

  return (
    <LeaderboardModalBase
      isOpen={isOpen}
      today={today}
      deviceId={deviceId}
      displayName={displayName}
      dates={recentDates}
      defaultDate={defaultPuzzleId}
      buildUrl={buildUrl}
      emptySlot={(date) =>
        date !== defaultPuzzleId ? (
          <Link
            href={`/leksokipos?puzzle=${date}`}
            className="text-muted text-sm underline hover:text-foreground"
          >
            {date === today ? "Παίξε το σημερινό παζλ →" : "Παίξε αυτό το παζλ →"}
          </Link>
        ) : null
      }
      footerSlot={(date) =>
        date !== defaultPuzzleId ? (
          <Link
            href={`/leksokipos?puzzle=${date}`}
            onClick={onClose}
            className="text-sm text-muted underline hover:text-foreground transition-colors"
          >
            {date === today ? "Παίξε το σημερινό παζλ →" : "Παίξε αυτό το παζλ →"}
          </Link>
        ) : null
      }
      onClose={onClose}
      {...profileSlot}
    />
  );
}
