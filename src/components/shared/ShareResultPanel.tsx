"use client";

// ShareResultPanel — the Platform's Result Panel: the surface every Game's Round
// End renders (ADR 0025).
//
// Most Games end the same way: a big score heading, a game-specific reveal line,
// the share action, and a leaderboard link. This owns everything they share: the
// score heading, the sharing itself, and the leaderboard link. The caller supplies
// only the reveal (the one part that differs per game) as children, plus a
// `testId` so each game keeps its own stable test hook. The summary the share
// sends is assembled by `composeShareText` (src/lib/shareText.ts) — no Game
// hand-rolls that layout, and this panel never inspects it.
//
// BOTH the score heading and the leaderboard link are optional, and for the same
// reason: a Game whose registry row grants neither capability has no number to
// show and no board to open (ADR 0027). With no score the heading is not rendered
// at all — an empty `0 πόντοι` would be a lie — and the Game's own reveal becomes
// the panel's leading line, which is why the two scoreless Games style theirs as
// a heading rather than as muted body text.
//
// Graduated to shared/ when the third near-identical copy (Λογοπαίγνιο) landed —
// three genuine consumers, per the shared-component rule (CLAUDE.md). The share
// summary is text + a share button, a different concern from FramedMedia (the
// media panel), so it stays its own component.
//
// SHARING IS TWO PATHS, and the order matters on a phone. `navigator.share` opens
// the OS sheet, which is how a Greek mobile audience reaches Viber and Messenger;
// where it does not exist (every desktop browser but Safari) the clipboard copy
// that shipped first is the fallback. Three details, each a shipped-bug shape:
//
//   - Feature-detect, never assume. `router.prefetch` returning `void` and jsdom's
//     `play()` returning `undefined` both cost this repo a release.
//   - `share()` REJECTS when the player backs out of the sheet. A cancel is not an
//     error and not a reason to copy something they did not ask for — it must read
//     as nothing happening.
//   - Any OTHER rejection is a genuine failure, so it falls through to the
//     clipboard rather than losing the summary.
//
// The share button is filled with --share, NOT --game-accent. On a Wordle-shaped
// board the game accent doubles as a feedback colour — Leksiarxeio's accent IS
// `correct` green — so an accent-filled button reads as a scored tile sitting under
// the grid. One platform-wide purple makes the share action mean the same thing on
// every Round End. The fill string is still hand-rolled (no recipe for solid fills
// yet, the known recipe debt in the memory Topothesies row), but in ONE place.

import { useState, type ReactNode } from "react";

interface ShareResultPanelProps {
  /** Stable test hook for the panel root (e.g. "topothesies-result"). */
  testId:            string;
  /**
   * The round's points. Omitted by a Game that has no scoring at all — the
   * heading is then not rendered, rather than rendered as zero.
   */
  score?:            number;
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

  const share = async () => {
    if (typeof navigator.share !== "function") return copy();
    try {
      await navigator.share({ text: shareText });
    } catch (err) {
      // The player backed out of the sheet: nothing happened, and nothing should
      // be reported. Anything else is a real failure — keep the summary reachable
      // by copying it instead.
      if ((err as Error)?.name === "AbortError") return;
      await copy();
    }
  };

  return (
    <div data-testid={testId} className="w-full flex flex-col items-center gap-3 py-2">
      {score !== undefined && (
        <h2 className="text-3xl font-bold text-foreground text-center">
          {score} πόντοι
        </h2>
      )}

      {children}

      {/* The primary affordance of the whole panel: full width of the game column,
          directly under the recap, so the thing we want a player to do is the
          biggest target on the screen rather than a chip beside a link. */}
      <button
        data-testid="btn-share-result"
        onClick={share}
        className="w-full max-w-game px-6 py-3 rounded-control bg-share text-share-foreground text-base font-bold hover:opacity-90 transition-opacity"
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
