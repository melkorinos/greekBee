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
// THE TWO PATHS MUST NOT WEAR THE SAME LABEL (2026-08-25). They did, and a desktop
// player pressed «Κοινοποίηση», got a silent clipboard write, and read the button
// as broken — the copy had in fact worked. A native sheet announces itself; a
// clipboard write is invisible, so the button has to do the announcing instead.
// Hence `canShareNatively`, read through `useSyncExternalStore`: `navigator` does
// not exist while this server-renders, and reading it in the render body would
// hydrate-mismatch. The hook's third argument is the server snapshot, so the
// server and the first client paint both say «Αντιγραφή» and a phone corrects
// itself to «Κοινοποίηση» — the safe direction, since the label starts by
// describing the path that always exists. This is NOT a setState-in-effect (the
// lint rule that caught the first attempt): there is no store to subscribe to
// because `navigator.share` never changes for the life of the page, so the
// subscribe function is a no-op and the snapshot is read directly.
//
// A FAILED COPY IS NOW VISIBLE. It used to be swallowed whole: clipboard writes
// fail on an insecure origin (any plain-HTTP preview) and under a permissions
// policy, and the player got a button that did nothing at all. The panel now
// reveals the summary in a selectable box so the round is still shareable by hand —
// this is the only path that can leave a player with nothing, so it is the only one
// with a visible fallback.
//
// The share button is filled with --share, NOT --game-accent. On a Wordle-shaped
// board the game accent doubles as a feedback colour — Leksiarxeio's accent IS
// `correct` green — so an accent-filled button reads as a scored tile sitting under
// the grid. One platform-wide purple makes the share action mean the same thing on
// every Round End. The fill string is still hand-rolled (no recipe for solid fills
// yet, the known recipe debt in the memory Topothesies row), but in ONE place.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

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
  /** Set when the clipboard refuses, so the summary can be shown for manual copying. */
  const [copyFailed, setCopyFailed] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** True on a browser that has a native share sheet — see the note above. */
  const canShareNatively = useSyncExternalStore(
    useCallback(() => () => {}, []),   // never changes, so nothing to subscribe to
    () => typeof navigator.share === "function",
    () => false,                        // server + first hydration paint
  );

  // The 2 s label reset outlives a fast unmount (a player who shares and closes the
  // modal), and firing setState afterwards warns in dev and leaks in production.
  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyFailed(false);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions). Reveal the summary so
      // the player can select it by hand rather than face a button that did nothing.
      setCopied(false);
      setCopyFailed(true);
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

  const shareLabel = canShareNatively ? "Κοινοποίηση" : "Αντιγραφή";

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
        {copied ? "Αντιγράφηκε" : shareLabel}
      </button>

      {/* Only ever rendered after a refused clipboard write — the one path that
          can otherwise leave a player with no way to get their summary out. */}
      {copyFailed && (
        <div data-testid="share-manual-fallback" className="w-full max-w-game flex flex-col gap-1">
          <p className="text-sm text-muted text-center">
            Η αντιγραφή δεν έγινε. Αντίγραψε το κείμενο με το χέρι:
          </p>
          <textarea
            readOnly
            rows={4}
            value={shareText}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full px-3 py-2 rounded-control border border-border bg-surface text-foreground text-sm font-mono resize-none"
          />
        </div>
      )}

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
