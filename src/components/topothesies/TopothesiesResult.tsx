"use client";

// End-of-round panel: outcome summary, the revealed answer + capital, the score,
// a spoiler-free share card (copy-to-clipboard), and a leaderboard link.

import { useState } from "react";

import type { TopothesiesAnswer } from "@/games/topothesies/types";

interface TopothesiesResultProps {
  target:            TopothesiesAnswer;
  score:             number;
  shareText:         string;
  onOpenLeaderboard: () => void;
}

export function TopothesiesResult({ target, score, shareText, onOpenLeaderboard }: TopothesiesResultProps) {
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

  return (
    <div data-testid="topothesies-result" className="w-full flex flex-col items-center gap-3 py-2">
      <h2 className="text-lg font-bold text-foreground text-center">
        Τέλος! {score} πόντοι
      </h2>

      <p className="text-center text-foreground">
        <span className="font-bold">{target.name}</span>
        <span className="text-muted"> · πρωτεύουσα </span>
        <span className="font-bold">{target.capital}</span>
      </p>

      <pre className="whitespace-pre-wrap text-center leading-relaxed text-foreground">{shareText}</pre>

      <button
        onClick={copy}
        className="px-4 py-2 rounded-control bg-game-accent text-game-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        {copied ? "Αντιγράφηκε! ✓" : "Κοινοποίηση 📋"}
      </button>

      <button
        onClick={onOpenLeaderboard}
        className="text-sm text-muted underline hover:text-foreground transition-colors"
      >
        🏆 Δες τον πίνακα σκορ
      </button>
    </div>
  );
}
