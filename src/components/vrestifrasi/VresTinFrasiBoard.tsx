"use client";

import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";
import {
  migrateLeksiarxeioIdentity,
  setDisplayName as saveDisplayName,
} from "@/hooks/useGameStore";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { FeedbackBanner } from "@/components/shared/FeedbackBanner";
import { Keyboard } from "./Keyboard";
import { PhraseGrid } from "./PhraseGrid";
import { VresTinFrasiLeaderboardModal } from "./VresTinFrasiLeaderboardModal";
import { normalizeLetters } from "@/lib/normalize";
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
  if (typeof window !== "undefined") migrateLeksiarxeioIdentity();
  const { deviceId, displayName, setDeviceId, setDisplayName } = useGameIdentity();
  const { profileLinked, createProfile, generateTransferCode, claimTransferCode, disconnect } =
    useProfile({
      deviceId,
      onDeviceIdChange:    setDeviceId,
      onDisplayNameChange: (name) => { setDisplayName(name); saveDisplayName(name); },
    });
  const { authLinked, authUserName, signInWithGoogle, signOut } = useAuth();

  const { submit: postScore } = useScoreSubmission({
    gameId:     "vrestifrasi",
    puzzleDate: today,
    deviceId,
    displayName,
  });

  const handleGameEnd = useCallback(
    (attempts: number, won: boolean) => {
      const attemptCount = won ? attempts : 7;
      postScore(attemptCount);
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

  // Physical keyboard
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useLayoutEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter")     return submitGuess();
      if (e.key === "Backspace") return deleteLetter();
      if (GREEK_LETTER.test(e.key)) addLetter(normalizeLetters(e.key));
    };
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

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

          <Keyboard
            letterStates={letterStates}
            onLetter={addLetter}
            onDelete={deleteLetter}
            onEnter={submitGuess}
            disabled={status !== "playing"}
          />
        </div>
      </div>

      <VresTinFrasiLeaderboardModal
        isOpen={isLeaderboardOpen}
        today={today}
        deviceId={deviceId}
        displayName={displayName}
        profileLinked={profileLinked}
        onSaveName={(name) => { setDisplayName(name); saveDisplayName(name); }}
        onProfileCreate={createProfile}
        onTransferGenerate={generateTransferCode}
        onTransferClaim={claimTransferCode}
        onDisconnect={disconnect}
        authLinked={authLinked}
        authUserName={authUserName}
        onSignIn={signInWithGoogle}
        onSignOut={signOut}
        onClose={onCloseLeaderboard}
      />
    </>
  );
}
