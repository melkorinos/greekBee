"use client";

// End-of-round panel: the revealed item + true price with its source citation
// (never claimed as "current" — always shown with store + date), wrapped in the
// shared ShareResultPanel (score heading + spoiler-free copy-share).
//
// No leaderboard link: the Game declares no `leaderboard` capability while its
// content is a placeholder (src/config/games.ts), so ShareResultPanel is given no
// onOpenLeaderboard and drops the link.

import { ShareResultPanel } from "@/components/shared/ShareResultPanel";
import { formatEuro } from "@/games/posokanei/lib/format";
import type { PosokaneiPuzzle } from "@/games/posokanei/types";

interface PosokaneiResultProps {
  target:    PosokaneiPuzzle;
  score:     number;
  shareText: string;
}

export function PosokaneiResult({ target, score, shareText }: PosokaneiResultProps) {
  const itemLabel = [target.item, target.brand, target.unit].filter(Boolean).join(" · ");

  return (
    <ShareResultPanel
      testId="posokanei-result"
      score={score}
      shareText={shareText}
    >
      <p className="text-center text-muted text-sm">
        <span className="font-semibold text-foreground">{itemLabel}</span>
      </p>

      <p className="text-center text-lg font-bold text-foreground">
        {formatEuro(target.price)}
      </p>
      <p className="text-center text-[11px] text-muted leading-relaxed">
        τιμή: {target.sourceStore}, {target.sourceDate}
      </p>
    </ShareResultPanel>
  );
}
