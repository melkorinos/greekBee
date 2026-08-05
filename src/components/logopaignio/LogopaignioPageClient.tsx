"use client";

// Λογοπαίγνιο page client — header, HowToPlay, and the board. No clock in this
// game, so modals never need to pause anything (mirrors PosokaneiPageClient).

import { useState } from "react";

import type { LogopaignioPuzzle } from "@/games/logopaignio/types";

import { GameHeader } from "@/components/shared/GameHeader";
import { GameHeaderTrophyButton } from "@/components/shared/GameHeaderTrophyButton";
import { HeaderIconButton } from "@/components/shared/HeaderIconButton";
import { HowToPlayModal } from "./HowToPlayModal";
import { LogopaignioBoard } from "./LogopaignioBoard";

interface LogopaignioPageClientProps {
  target: LogopaignioPuzzle;
  today:  string;
}

export function LogopaignioPageClient({ target, today }: LogopaignioPageClientProps) {
  const [lbOpen, setLbOpen]   = useState(false);
  const [htpOpen, setHtpOpen] = useState(false);

  return (
    <>
      <GameHeader title="Λογοπαίγνιο">
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
          rather than carrying the previous date's round across. */}
      <LogopaignioBoard
        key={today}
        target={target}
        today={today}
        isLeaderboardOpen={lbOpen}
        onOpenLeaderboard={() => setLbOpen(true)}
        onCloseLeaderboard={() => setLbOpen(false)}
      />

      <HowToPlayModal
        isOpen={htpOpen}
        onClose={() => setHtpOpen(false)}
        markCredit={target.credit}
      />
    </>
  );
}
