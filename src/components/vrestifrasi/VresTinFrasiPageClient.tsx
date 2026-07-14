"use client";

import { VresTinFrasiBoard } from "./VresTinFrasiBoard";
import { HowToPlayModal } from "./HowToPlayModal";
import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";
import { useState } from "react";
import { HeaderIconButton } from "@/components/shared/HeaderIconButton";
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
      <div className="flex items-center justify-between w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          💬 Vres Tin Frasi
        </h1>
        <div className="flex items-center gap-2">
          <GameHeaderTrophyButton onClick={() => setLbOpen(true)} />
          <HeaderIconButton
            onClick={() => setHtpOpen(true)}
            ariaLabel="Πώς να παίξεις"
            tooltip="Κανόνες"
            className="text-sm font-bold"
          >
            ?
          </HeaderIconButton>
        </div>
      </div>

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
