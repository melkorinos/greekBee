"use client";

// Topothesies page client — its board and its rules modal, inside the shared
// chrome (GamePageChrome owns the title row, both triggers, and the session key).

import type { TopothesiesAnswer, TopothesiesShape } from "@/games/topothesies/types";

import { GamePageChrome } from "@/components/shared/GamePageChrome";
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
  return (
    <GamePageChrome
      title="Topothesies"
      sessionKey={today}
      howToPlay={(props) => <HowToPlayModal {...props} />}
    >
      {({ leaderboard }) => (
        <TopothesiesBoard
          answers={answers}
          target={target}
          shape={shape}
          today={today}
          maxKm={maxKm}
          {...leaderboard}
        />
      )}
    </GamePageChrome>
  );
}
