"use client";

// Λογοπαίγνιο page client — its board and its rules modal, inside the shared
// chrome (GamePageChrome owns the title row, both triggers, and the session key).

import type { LogopaignioPuzzle } from "@/games/logopaignio/types";

import { GamePageChrome } from "@/components/shared/GamePageChrome";
import { HowToPlayModal } from "./HowToPlayModal";
import { LogopaignioBoard } from "./LogopaignioBoard";

interface LogopaignioPageClientProps {
  target: LogopaignioPuzzle;
  today:  string;
}

export function LogopaignioPageClient({ target, today }: LogopaignioPageClientProps) {
  return (
    <GamePageChrome
      title="Λογοπαίγνιο"
      sessionKey={today}
      howToPlay={(props) => <HowToPlayModal {...props} markCredit={target.credit} />}
    >
      {({ leaderboard }) => (
        <LogopaignioBoard target={target} today={today} {...leaderboard} />
      )}
    </GamePageChrome>
  );
}
