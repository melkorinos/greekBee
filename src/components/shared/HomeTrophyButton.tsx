"use client";

// HomeTrophyButton — 🏆 icon on landing-page game cards.
// Opens the game's leaderboard with full auth + profile support.
// One instance per applicable game card (leksokipos, leksiarxeio, leksindeseis,
// vrestifrasi, leksodromia, leksoplegma).

import { useState } from "react";
import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
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

  const today = new Date().toISOString().slice(0, 10);

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
