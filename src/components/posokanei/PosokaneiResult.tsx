"use client";

// End-of-round panel: score, the revealed item + true price with its source
// citation (never claimed as "current" — always shown with store + date), a
// spoiler-free share card (copy-to-clipboard), and a leaderboard link. Mirrors
// TopothesiesResult.

import { useState } from "react";

import { formatEuro } from "@/games/posokanei/lib/format";
import type { PosokaneiPuzzle } from "@/games/posokanei/types";

interface PosokaneiResultProps {
  target:            PosokaneiPuzzle;
  score:             number;
  shareText:         string;
  onOpenLeaderboard: () => void;
}

export function PosokaneiResult({ target, score, shareText, onOpenLeaderboard }: PosokaneiResultProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — leave the text visible.
    }
  };

  const itemLabel = [target.item, target.brand, target.unit].filter(Boolean).join(" · ");

  return (
    <div data-testid="posokanei-result" className="w-full flex flex-col items-center gap-3 py-2">
      <h2 className="text-3xl font-bold text-foreground text-center">
        {score} πόντοι
      </h2>

      <p className="text-center text-muted text-sm">
        <span className="font-semibold text-foreground">{itemLabel}</span>
      </p>

      <p className="text-center text-lg font-bold text-foreground">
        {formatEuro(target.price)}
      </p>
      <p className="text-center text-[11px] text-muted leading-relaxed">
        τιμή: {target.sourceStore}, {target.sourceDate}
      </p>

      <button
        onClick={copy}
        className="px-4 py-2 rounded-control bg-game-accent text-game-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        {copied ? "Αντιγράφηκε" : "Κοινοποίηση"}
      </button>

      <button
        onClick={onOpenLeaderboard}
        className="text-sm text-muted underline hover:text-foreground transition-colors"
      >
        Δες τον πίνακα σκορ
      </button>
    </div>
  );
}
