"use client";

// End-of-round panel: the revealed answer + capital, wrapped in the shared
// ShareResultPanel (score heading + spoiler-free copy-share + leaderboard link).

import { ShareResultPanel } from "@/components/shared/ShareResultPanel";
import type { TopothesiesAnswer } from "@/games/topothesies/types";

interface TopothesiesResultProps {
  target:            TopothesiesAnswer;
  score:             number;
  shareText:         string;
  onOpenLeaderboard: () => void;
}

export function TopothesiesResult({ target, score, shareText, onOpenLeaderboard }: TopothesiesResultProps) {
  return (
    <ShareResultPanel
      testId="topothesies-result"
      score={score}
      shareText={shareText}
      onOpenLeaderboard={onOpenLeaderboard}
    >
      <p className="text-center text-muted text-sm">
        <span className="font-semibold text-foreground">{target.name}</span>
        {" · πρωτεύουσα "}
        <span className="font-semibold text-foreground">{target.capital}</span>
      </p>
    </ShareResultPanel>
  );
}
