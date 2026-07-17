"use client";

// Λεξόπλεγμα page client — header, HowToPlay, and the board.
// No clock in this game, so modals never need to pause anything.

import { useState } from "react";

import type { LeksoplegmaPuzzle } from "@/games/leksoplegma/types";

import { HeaderIconButton } from "@/components/shared/HeaderIconButton";
import { GameHeader } from "@/components/shared/GameHeader";
import { GameHeaderTrophyButton } from "@/components/shared/GameHeaderTrophyButton";
import { HowToPlayModal } from "./HowToPlayModal";
import { LeksoplegmaBoard } from "./LeksoplegmaBoard";

interface LeksoplegmaPageClientProps {
  puzzle: LeksoplegmaPuzzle;
  today:  string;
}

export function LeksoplegmaPageClient({ puzzle, today }: LeksoplegmaPageClientProps) {
  const [lbOpen,  setLbOpen]  = useState(false);
  const [htpOpen, setHtpOpen] = useState(false);

  return (
    <>
      {/* Header row */}
      <GameHeader title="🕸️ Leksoplegma">
        <GameHeaderTrophyButton onClick={() => setLbOpen(true)} />
        <HeaderIconButton
          onClick={() => setHtpOpen(true)}
          ariaLabel="Πώς να παίξεις"
          tooltip="Κανόνες"
          className="text-sm font-bold"
        >
          ?
        </HeaderIconButton>
      </GameHeader>

      <LeksoplegmaBoard
        puzzle={puzzle}
        today={today}
        isLeaderboardOpen={lbOpen}
        onOpenLeaderboard={() => setLbOpen(true)}
        onCloseLeaderboard={() => setLbOpen(false)}
      />

      <HowToPlayModal isOpen={htpOpen} onClose={() => setHtpOpen(false)} />
    </>
  );
}
