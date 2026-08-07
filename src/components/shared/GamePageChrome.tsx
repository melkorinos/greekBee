"use client";

// GamePageChrome — the chrome every game page wraps its board in: the title row,
// the 🏆 leaderboard trigger, the ? rules trigger, and the two pieces of
// open/closed state those triggers drive.
//
// Six page clients held this identically — two useState calls, a GameHeader with
// the same two buttons, a session-keyed board, a rules modal. Only the board and
// the rules modal genuinely differ, so both arrive as **render props** rather
// than as config: a board's props are its own (Topothesies declares five,
// Πόσο κάνει; one) and no shared config type can describe them without widening
// to `any`. The chrome owns the state and the layout; the game owns its elements.
//
// This is page chrome, not a round spine. Membership has nothing to do with the
// guess/slot-fill split of ADR 0019 — Λεξοδρομία deliberately runs its own round
// hook and still belongs here, because its *page* looks like every other page.

import { Fragment, useCallback, useMemo, useState, type ReactNode } from "react";

import { GameHeader } from "./GameHeader";
import { GameHeaderTrophyButton } from "./GameHeaderTrophyButton";
import { GameHelpButton } from "./GameHelpButton";

/** Exactly the three leaderboard props every Board declares — spread as one. */
export interface GameChromeLeaderboardProps {
  isLeaderboardOpen:  boolean;
  onOpenLeaderboard:  () => void;
  onCloseLeaderboard: () => void;
}

export interface GameChromeRenderProps {
  /** Spread straight into the game's Board. */
  leaderboard:     GameChromeLeaderboardProps;
  /** Whether the rules modal is open — Λεξοδρομία pauses its decay clock on it. */
  isHowToPlayOpen: boolean;
}

interface GamePageChromeProps {
  /** Full title including its emoji, e.g. "🕸️ Leksoplegma". */
  title:      string;
  /**
   * The Session key this game persists under — the puzzle date for most games,
   * the puzzle id for Vres Tin Frasi. A Session belongs to one Puzzle, so the
   * chrome keys the board subtree on it: the leaderboard's "play this puzzle"
   * link is a client-side navigation, so without the key React keeps the board
   * mounted, the reducer's lazy initialiser never re-runs, and the previous
   * date's finished round is painted onto the new Puzzle. Stated here once
   * instead of in a comment above every page client's board.
   */
  sessionKey: string;
  /** The game's rules modal, built from the open/close pair the chrome owns. */
  howToPlay:  (props: { isOpen: boolean; onClose: () => void }) => ReactNode;
  /** The game's board, built from the chrome's open-state props. */
  children:   (props: GameChromeRenderProps) => ReactNode;
}

export function GamePageChrome({ title, sessionKey, howToPlay, children }: GamePageChromeProps) {
  const [lbOpen,  setLbOpen]  = useState(false);
  const [htpOpen, setHtpOpen] = useState(false);

  const openLeaderboard  = useCallback(() => setLbOpen(true), []);
  const closeLeaderboard = useCallback(() => setLbOpen(false), []);
  const openHowToPlay    = useCallback(() => setHtpOpen(true), []);
  const closeHowToPlay   = useCallback(() => setHtpOpen(false), []);

  // Stable identity: boards feed these straight into effect dependency arrays.
  const leaderboard = useMemo<GameChromeLeaderboardProps>(
    () => ({
      isLeaderboardOpen:  lbOpen,
      onOpenLeaderboard:  openLeaderboard,
      onCloseLeaderboard: closeLeaderboard,
    }),
    [lbOpen, openLeaderboard, closeLeaderboard],
  );

  return (
    <>
      <GameHeader title={title}>
        <GameHeaderTrophyButton onClick={openLeaderboard} />
        <GameHelpButton onClick={openHowToPlay} />
      </GameHeader>

      <Fragment key={sessionKey}>
        {children({ leaderboard, isHowToPlayOpen: htpOpen })}
      </Fragment>

      {howToPlay({ isOpen: htpOpen, onClose: closeHowToPlay })}
    </>
  );
}
