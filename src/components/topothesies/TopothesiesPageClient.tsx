"use client";

// Topothesies page client — header, HowToPlay, and the board.
// No clock in this game, so modals never need to pause anything.

import { useState } from "react";

import type { TopothesiesAnswer, TopothesiesShape } from "@/games/topothesies/types";

import { GameHeader } from "@/components/shared/GameHeader";
import { GameHeaderTrophyButton } from "@/components/shared/GameHeaderTrophyButton";
import { HeaderIconButton } from "@/components/shared/HeaderIconButton";
import { HowToPlayModal } from "./HowToPlayModal";
import { TopothesiesBoard } from "./TopothesiesBoard";

interface TopothesiesPageClientProps {
  answers: TopothesiesAnswer[];
  target:  TopothesiesAnswer;
  shape:   TopothesiesShape;
  today:   string;
  maxKm:   number;
}

export function TopothesiesPageClient({ answers, target, shape, today, maxKm }: TopothesiesPageClientProps) {
  const [lbOpen, setLbOpen]   = useState(false);
  const [htpOpen, setHtpOpen] = useState(false);

  return (
    <>
      <GameHeader title="🗺️ Topothesies">
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

      <TopothesiesBoard
        answers={answers}
        target={target}
        shape={shape}
        today={today}
        maxKm={maxKm}
        isLeaderboardOpen={lbOpen}
        onOpenLeaderboard={() => setLbOpen(true)}
        onCloseLeaderboard={() => setLbOpen(false)}
      />

      <HowToPlayModal isOpen={htpOpen} onClose={() => setHtpOpen(false)} />
    </>
  );
}
