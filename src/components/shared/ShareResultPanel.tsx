"use client";

// ShareResultPanel — the platform's end-of-round summary panel.
//
// Every daily round game (Topothesies, Πόσο κάνει;, Λογοπαίγνιο) ends the same
// way: a big score heading, a game-specific reveal line, a copy-to-clipboard
// share button, and a leaderboard link. This owns everything the three share:
// the score heading, the identical clipboard logic, the Κοινοποίηση button, and
// the leaderboard link. The caller supplies only the reveal (the one part that
// differs per game) as children, plus a `testId` so each game keeps its own
// stable test hook.
//
// Graduated to shared/ when the third near-identical copy (Λογοπαίγνιο) landed —
// three genuine consumers, per the shared-component rule (CLAUDE.md). The share
// summary is text + a copy button, a different concern from FramedMedia (the
// media panel), so it stays its own component.
//
// The accent-fill share button is the known recipe debt (memory Topothesies row):
// there is no recipe for accent fills yet, so the string is hand-rolled here — but
// now in ONE place, so fixing it later is a single edit.

import { useState, type ReactNode } from "react";

interface ShareResultPanelProps {
  /** Stable test hook for the panel root (e.g. "topothesies-result"). */
  testId:            string;
  score:             number;
  /** Spoiler-free emoji summary copied to the clipboard on share. */
  shareText:         string;
  /**
   * Opens the leaderboard. Omitted by a Game whose registry row does not declare
   * the `leaderboard` capability — the link is then not rendered at all, rather
   * than opening a modal with no board behind it.
   */
  onOpenLeaderboard?: () => void;
  /** The game-specific reveal line(s) — the only part that differs per game. */
  children:          ReactNode;
}

export function ShareResultPanel({
  testId,
  score,
  shareText,
  onOpenLeaderboard,
  children,
}: ShareResultPanelProps) {
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
    <div data-testid={testId} className="w-full flex flex-col items-center gap-3 py-2">
      <h2 className="text-3xl font-bold text-foreground text-center">
        {score} πόντοι
      </h2>

      {children}

      <button
        onClick={copy}
        className="px-4 py-2 rounded-control bg-game-accent text-game-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        {copied ? "Αντιγράφηκε" : "Κοινοποίηση"}
      </button>

      {onOpenLeaderboard && (
        <button
          onClick={onOpenLeaderboard}
          className="text-sm text-muted underline hover:text-foreground transition-colors"
        >
          Δες τον πίνακα σκορ
        </button>
      )}
    </div>
  );
}
