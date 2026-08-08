"use client";

// End-of-round panel: the revealed brand + sector, wrapped in the shared
// ShareResultPanel (score heading + spoiler-free copy-share). The clear (revealed)
// mark itself is drawn above by LogoReveal — this panel names the answer.
//
// No leaderboard link: the Game declares no `leaderboard` capability while its
// content is a placeholder (src/config/games.ts), so ShareResultPanel is given no
// onOpenLeaderboard and drops the link.

import { ShareResultPanel } from "@/components/shared/ShareResultPanel";
import type { LogopaignioPuzzle } from "@/games/logopaignio/types";

interface LogopaignioResultProps {
  target:    LogopaignioPuzzle;
  solved:    boolean;
  score:     number;
  shareText: string;
}

export function LogopaignioResult({
  target,
  solved,
  score,
  shareText,
}: LogopaignioResultProps) {
  return (
    <ShareResultPanel
      testId="logopaignio-result"
      score={score}
      shareText={shareText}
    >
      <p className="text-center text-sm text-muted">
        {solved ? "Σωστά! 🎉 " : "Ήταν η "}
        <span className="font-semibold text-foreground">{target.brand}</span>
      </p>
      <p className="text-center text-xs text-muted">{target.sector}</p>
    </ShareResultPanel>
  );
}
