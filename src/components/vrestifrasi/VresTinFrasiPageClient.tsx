"use client";

// Vres Tin Frasi page client — its board and its rules modal, inside the shared
// chrome. The one member whose Session key is the puzzle **id**, not the date
// (the guess family keys by puzzle id — ADR 0019).

import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";

import { GamePageChrome } from "@/components/shared/GamePageChrome";
import { HowToPlayModal } from "./HowToPlayModal";
import { VresTinFrasiBoard } from "./VresTinFrasiBoard";

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
  return (
    <GamePageChrome
      title="💬 Vres Tin Frasi"
      sessionKey={puzzle.id}
      hasLeaderboard={false}
      howToPlay={(props) => <HowToPlayModal {...props} />}
    >
      {() => (
        <VresTinFrasiBoard
          puzzle={puzzle}
          validWords={validWords}
          today={today}
        />
      )}
    </GamePageChrome>
  );
}
