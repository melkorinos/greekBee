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

      {/* A Session belongs to one Puzzle. The day-strip's "play this puzzle"
          link is a client-side navigation, so without this key React keeps the
          board mounted, the reducer's lazy initialiser never re-runs, and the
          previous date's finished round is painted onto the new Puzzle. Every
          game that can switch Daily Puzzles keys its board the same way. */}
      <VresTinFrasiBoard
        key={puzzle.id}
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
