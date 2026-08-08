"use client";

// Πόσο κάνει; page client — its board and its rules modal, inside the shared
// chrome (GamePageChrome owns the title row, both triggers, and the session key).

import type { PosokaneiPuzzle } from "@/games/posokanei/types";

import { GamePageChrome } from "@/components/shared/GamePageChrome";
import { HowToPlayModal } from "./HowToPlayModal";
import { PosokaneiBoard } from "./PosokaneiBoard";

interface PosokaneiPageClientProps {
  target: PosokaneiPuzzle;
  today:  string;
}

export function PosokaneiPageClient({ target, today }: PosokaneiPageClientProps) {
  return (
    <GamePageChrome
      title="Πόσο κάνει;"
      sessionKey={today}
      hasLeaderboard={false}
      howToPlay={(props) => (
        <HowToPlayModal
          {...props}
          photoCredit={`${target.photoSource} — ${target.photoLicense}`}
        />
      )}
    >
      {() => <PosokaneiBoard target={target} today={today} />}
    </GamePageChrome>
  );
}
