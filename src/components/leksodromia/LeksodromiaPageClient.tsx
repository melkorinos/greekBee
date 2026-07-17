"use client";

// Λεξοδρομία page client — header, HowToPlay, and the board.
// The HowToPlay modal pauses the decay clock while open.

import { useState } from "react";

import { HeaderIconButton } from "@/components/shared/HeaderIconButton";
import { GameHeader } from "@/components/shared/GameHeader";
import { GameHeaderTrophyButton } from "@/components/shared/GameHeaderTrophyButton";
import { HowToPlayModal } from "./HowToPlayModal";
import { LeksodromiaBoard } from "./LeksodromiaBoard";

interface LeksodromiaPageClientProps {
  puzzle: { date: string; words: string[]; scrambles: string[]; accepted: string[][] };
  today:  string;
}

export function LeksodromiaPageClient({ puzzle, today }: LeksodromiaPageClientProps) {
  const [lbOpen,  setLbOpen]  = useState(false);
  const [htpOpen, setHtpOpen] = useState(false);

  return (
    <>
      {/* Header row */}
      <GameHeader title="🏁 Leksodromia">
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

      <LeksodromiaBoard
        puzzle={puzzle}
        today={today}
        paused={htpOpen}
        isLeaderboardOpen={lbOpen}
        onOpenLeaderboard={() => setLbOpen(true)}
        onCloseLeaderboard={() => setLbOpen(false)}
      />

      <HowToPlayModal isOpen={htpOpen} onClose={() => setHtpOpen(false)} />
    </>
  );
}
