"use client";

// HomeTrophyButton — 🏆 icon on landing-page game cards.
// Opens the game's leaderboard with full auth + profile support.
// One instance per game card whose game has a leaderboard — the `LeaderboardGameId`
// prop is what says which those are, so this comment does not enumerate them (it
// listed six of nine before that union became registry-derived).

import { useState } from "react";
import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import { todayISO } from "@/lib/puzzleDate";
import { btnHeaderIcon, btnHeaderIconSize } from "@/styles/recipes";
import {
  GameLeaderboardModal,
  type LeaderboardGameId,
} from "@/components/shared/GameLeaderboardModal";

interface HomeTrophyButtonProps {
  gameId: LeaderboardGameId;
}

export function HomeTrophyButton({ gameId }: HomeTrophyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const identity = usePlayerIdentity();

  const today = todayISO();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Πίνακας Σκορ"
        title="Πίνακας Σκορ"
        className={`${btnHeaderIconSize} ${btnHeaderIcon} text-trophy`}
      >
        🏆
      </button>

      <GameLeaderboardModal
        {...identity.leaderboardProps}
        gameId={gameId}
        isOpen={isOpen}
        today={today}
        // Leksindeseis shows a single-date strip; every other game the default 7-day strip.
        dates={gameId === "leksindeseis" ? [today] : undefined}
        score={0}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
