"use client";

// End-of-round panel: the revealed brand + sector, wrapped in the shared
// ShareResultPanel (score heading + spoiler-free copy-share + leaderboard link).
// The clear (revealed) mark itself is drawn above by LogoReveal — this panel
// names the answer.

import { ShareResultPanel } from "@/components/shared/ShareResultPanel";
import type { LogopaignioPuzzle } from "@/games/logopaignio/types";

interface LogopaignioResultProps {
  target:            LogopaignioPuzzle;
  solved:            boolean;
  score:             number;
  shareText:         string;
  onOpenLeaderboard: () => void;
}

export function LogopaignioResult({
  target,
  solved,
  score,
  shareText,
  onOpenLeaderboard,
}: LogopaignioResultProps) {
  return (
    <ShareResultPanel
      testId="logopaignio-result"
      score={score}
      shareText={shareText}
      onOpenLeaderboard={onOpenLeaderboard}
    >
      <p className="text-center text-sm text-muted">
        {solved ? "Σωστά! 🎉 " : "Ήταν η "}
        <span className="font-semibold text-foreground">{target.brand}</span>
      </p>
      <p className="text-center text-xs text-muted">{target.sector}</p>
    </ShareResultPanel>
  );
}
