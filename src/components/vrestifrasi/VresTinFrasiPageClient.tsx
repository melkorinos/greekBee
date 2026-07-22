"use client";

import { VresTinFrasiBoard } from "./VresTinFrasiBoard";
import { HowToPlayModal } from "./HowToPlayModal";
import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";
import { useState } from "react";
import { HeaderIconButton } from "@/components/shared/HeaderIconButton";
import { GameHeader } from "@/components/shared/GameHeader";
import { GameHeaderTrophyButton } from "@/components/shared/GameHeaderTrophyButton";

interface VresTinFrasiPageClientProps {
  puzzle:     VresTinFrasiPuzzle;
  validWords: string[];
  today:      string;
}

export function VresTinFrasiPageClient({
  puzzle,
  validWords,
  today,
}: VresTinFrasiPageClientProps) {
  const [lbOpen,  setLbOpen]  = useState(false);
  const [htpOpen, setHtpOpen] = useState(false);

  return (
    <>
      {/* Header row */}
      <GameHeader title="💬 Vres Tin Frasi">
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

      <VresTinFrasiBoard
        puzzle={puzzle}
        validWords={validWords}
        today={today}
        isLeaderboardOpen={lbOpen}
        onOpenLeaderboard={() => setLbOpen(true)}
        onCloseLeaderboard={() => setLbOpen(false)}
      />

      <HowToPlayModal isOpen={htpOpen} onClose={() => setHtpOpen(false)} />
    </>
  );
}
