"use client";

// End-of-round panel: the revealed item + true price with its source citation
// (never claimed as "current" — always shown with store + date), wrapped in the
// shared ShareResultPanel (score heading + spoiler-free copy-share + leaderboard
// link).

import { ShareResultPanel } from "@/components/shared/ShareResultPanel";
import { formatEuro } from "@/games/posokanei/lib/format";
import type { PosokaneiPuzzle } from "@/games/posokanei/types";

interface PosokaneiResultProps {
  target:            PosokaneiPuzzle;
  score:             number;
  shareText:         string;
  onOpenLeaderboard: () => void;
}

export function PosokaneiResult({ target, score, shareText, onOpenLeaderboard }: PosokaneiResultProps) {
  const itemLabel = [target.item, target.brand, target.unit].filter(Boolean).join(" · ");

  return (
    <ShareResultPanel
      testId="posokanei-result"
      score={score}
      shareText={shareText}
      onOpenLeaderboard={onOpenLeaderboard}
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
