"use client";

// Λεξόπλεγμα page client — its board and its rules modal, inside the shared
// chrome (GamePageChrome owns the title row, both triggers, and the session key).

import type { LeksoplegmaPuzzle } from "@/games/leksoplegma/types";

import { GamePageChrome } from "@/components/shared/GamePageChrome";
import { HowToPlayModal } from "./HowToPlayModal";
import { LeksoplegmaBoard } from "./LeksoplegmaBoard";

interface LeksoplegmaPageClientProps {
  puzzle: LeksoplegmaPuzzle;
  today:  string;
}

export function LeksoplegmaPageClient({ puzzle, today }: LeksoplegmaPageClientProps) {
  return (
    <GamePageChrome
      title="🕸️ Leksoplegma"
      sessionKey={today}
      howToPlay={(props) => <HowToPlayModal {...props} />}
    >
      {({ leaderboard }) => (
        <LeksoplegmaBoard puzzle={puzzle} today={today} {...leaderboard} />
      )}
    </GamePageChrome>
  );
}
