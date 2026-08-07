"use client";

// Λεξοδρομία page client — its board and its rules modal, inside the shared
// chrome. The one member that uses `isHowToPlayOpen`: the decay clock pauses
// while the rules are on screen.

import { GamePageChrome } from "@/components/shared/GamePageChrome";
import { HowToPlayModal } from "./HowToPlayModal";
import { LeksodromiaBoard } from "./LeksodromiaBoard";

interface LeksodromiaPageClientProps {
  puzzle: { date: string; words: string[]; scrambles: string[]; accepted: string[][] };
  today:  string;
}

export function LeksodromiaPageClient({ puzzle, today }: LeksodromiaPageClientProps) {
  return (
    <GamePageChrome
      title="🏁 Leksodromia"
      sessionKey={today}
      howToPlay={(props) => <HowToPlayModal {...props} />}
    >
      {({ leaderboard, isHowToPlayOpen }) => (
        <LeksodromiaBoard
          puzzle={puzzle}
          today={today}
          paused={isHowToPlayOpen}
          {...leaderboard}
        />
      )}
    </GamePageChrome>
  );
}
