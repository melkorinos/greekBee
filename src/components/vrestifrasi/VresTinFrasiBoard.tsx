"use client";

import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";
import { usePhysicalKeyboard } from "@/hooks/usePhysicalKeyboard";
import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import { useCallback, useEffect } from "react";

import { FeedbackBanner } from "@/components/shared/FeedbackBanner";
import { Keyboard } from "./Keyboard";
import { PhraseGrid } from "./PhraseGrid";
import { GameLeaderboardModal } from "@/components/shared/GameLeaderboardModal";
import { normalizeLetters } from "@/lib/normalize";
import { todayISO } from "@/lib/puzzleDate";
import { scoreVresTinFrasi } from "@/games/vrestifrasi/lib/scoring";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";
import { useVresTinFrasiState } from "@/games/vrestifrasi/hooks/useVresTinFrasiState";

const GREEK_LETTER = /^[α-ωά-ώΑ-ΩΆ-Ώ]$/i;

interface VresTinFrasiBoardProps {
  puzzle:              VresTinFrasiPuzzle;
  validWords:          string[];
  today:               string;
  isLeaderboardOpen:   boolean;
  onOpenLeaderboard:   () => void;
  onCloseLeaderboard:  () => void;
}

export function VresTinFrasiBoard({
  puzzle,
  validWords,
  today,
  isLeaderboardOpen,
  onOpenLeaderboard,
  onCloseLeaderboard,
}: VresTinFrasiBoardProps) {
  const identity = usePlayerIdentity();
  const { deviceId, displayName } = identity;

  const { submit: postScore } = useScoreSubmission({
    gameId:     "vrestifrasi",
    puzzleDate: today,
    deviceId,
    displayName,
  });

  const handleGameEnd = useCallback(
    (attempts: number, won: boolean) => {
      // Post points, higher-is-better (6 for a 1-guess win → 1 for a 6-guess
      // win, 0 for a loss) — same scale as Leksiarxeio. The leaderboard sorts
      // desc like every other game (ADR 0014); no lower-is-better boards.
      postScore(scoreVresTinFrasi(attempts, won));
      setTimeout(() => onOpenLeaderboard(), 1500);
    },
    [postScore, onOpenLeaderboard],
  );

  const {
    guesses,
    currentWords,
    currentWordIndex,
    status,
    lastMessage,
    letterStates,
    maxGuesses,
    addLetter,
    deleteLetter,
    submitGuess,
    clearMessage,
  } = useVresTinFrasiState(puzzle, validWords, handleGameEnd);

  usePhysicalKeyboard((e) => {
    if (e.key === "Enter")     return submitGuess();
    if (e.key === "Backspace") return deleteLetter();
    if (GREEK_LETTER.test(e.key)) addLetter(normalizeLetters(e.key));
  });

  // Auto-clear transient messages
  useEffect(() => {
    if (!lastMessage || status !== "playing") return;
    const t = setTimeout(clearMessage, 2000);
    return () => clearTimeout(t);
  }, [lastMessage, clearMessage, status]);

  return (
    <>
      <div className="flex flex-col items-center gap-4 py-4 w-full">
        <div className="h-8">
          <FeedbackBanner
            message={lastMessage}
            variant={status === "won" ? "success" : status === "lost" ? "error" : "neutral"}
          />
        </div>

        <div className="w-full max-w-sm flex flex-col items-center gap-4 px-2">
          <PhraseGrid
            guesses={guesses}
            currentWords={currentWords}
            currentWordIndex={currentWordIndex}
            wordLengths={puzzle.wordLengths}
            maxGuesses={maxGuesses}
          />

          {/* Pin the keyboard to the bottom of the viewport so a tall phrase grid
              can't push it below the fold — the player always sees the keys and
              keeps the grid (what they're typing) in view. Scoped to this game;
              works because no ancestor clips overflow (document-level scroll). */}
          <div className="sticky bottom-0 z-20 w-full bg-background pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <Keyboard
              letterStates={letterStates}
              onLetter={addLetter}
              onDelete={deleteLetter}
              onEnter={submitGuess}
              disabled={status !== "playing"}
            />
          </div>
        </div>
      </div>

      <GameLeaderboardModal
        gameId="vrestifrasi"
        isOpen={isLeaderboardOpen}
        today={todayISO()}
        defaultDate={today}
        onClose={onCloseLeaderboard}
        {...identity.leaderboardProps}
      />
    </>
  );
}
