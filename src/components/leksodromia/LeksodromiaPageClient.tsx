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

      {/* Keyed by date — the Session key this game persists under. A Session
          belongs to one Puzzle, so switching Daily Puzzles remounts the board
          rather than carrying the previous date's round across (this game runs
          its own round hook, not a Round Spine — ADR 0019 — but the rule is
          the platform's, not the spine's). */}
      <LeksodromiaBoard
        key={today}
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
