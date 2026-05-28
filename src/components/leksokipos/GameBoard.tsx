"use client";

// GameBoard -- the top-level client component that composes all game UI pieces.
// Receives the initial puzzle as a prop (loaded server-side in page.tsx).

import { setDisplayName as saveDisplayName } from "@/hooks/useGameStore";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { useProfile } from "@/hooks/useProfile";
import { useProfileVerification } from "@/hooks/useProfileVerification";
import { getSuggestedWords, markSuggested } from "@/hooks/suggestions";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { FeedbackMessage } from "./FeedbackMessage";
import { FoundWordsList } from "./FoundWordsList";
import { FlowerGridPlayground as FlowerGrid } from "./FlowerGridPlayground";
import { LeaderboardModal } from "./LeaderboardModal";
import { MissedWordsList } from "./MissedWordsList";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { ScoreBar } from "./ScoreBar";
import { NominationModal } from "@/components/shared/NominationModal";
import { WordInput } from "./WordInput";
import { btnSecondary } from "./styles";
import { useGameState } from "@/games/leksokipos/hooks/useGameState";
import { useGameStateSync } from "@/hooks/useGameStateSync";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";
import { isDailyPuzzle } from "@/games/leksokipos/lib";

interface GameBoardProps {
  puzzle: LeksokiposPuzzle;
  /** Last 7 daily puzzle dates (newest-first), computed server-side. */
  recentPuzzleDates?: string[];
  variant?: "pie" | "flower";
}

export function GameBoard({ puzzle, recentPuzzleDates = [], variant }: GameBoardProps) {
  const {
    puzzle: activePuzzle,
    currentInput,
    foundWords,
    score,
    currentRank,
    puzzleMaxScore,
    lastSubmission,
    givenUp,
    addLetter,
    deleteLetter,
    clearInput,
    submitWord,
    shuffleLetters,
    handleKeyboardLetter,
    giveUp,
  } = useGameState(puzzle);

  // Word suggestion
  const [suggestWord,    setSuggestWord]    = useState<string | null>(null);
  const [suggestedWords, setSuggestedWords] = useState<Set<string>>(
    () => typeof window === "undefined" ? new Set() : new Set(getSuggestedWords())
  );
  const [justSuggested, setJustSuggested] = useState<string | null>(null);

  // Leaderboard + profile
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const { deviceId, displayName, setDeviceId: setDeviceIdState, setDisplayName: setDisplayNameState } = useGameIdentity();

  // Only daily puzzles participate in the leaderboard.
  const isDaily          = isDailyPuzzle(activePuzzle);
  const leaderboardPuzzleId = activePuzzle.date;

  // Score submission -- all posting logic lives in the hook.
  const { submit: postScore, submitWithName: postScoreWithName } = useScoreSubmission({
    gameId:      "leksokipos",
    puzzleDate:  leaderboardPuzzleId,
    deviceId,
    displayName,
    enabled:     isDaily,
  });

  // Auto-post whenever the score increases.
  useEffect(() => { postScore(score); }, [score, postScore]);

  // Cross-device sync — pushes state on every valid word, daily puzzles only.
  useGameStateSync({ puzzleDate: leaderboardPuzzleId, isDaily, foundWords });

  const { profileLinked, createProfile, generateTransferCode, claimTransferCode, disconnect } = useProfile({
    deviceId,
    onDeviceIdChange:    setDeviceIdState,
    onDisplayNameChange: (name) => { setDisplayNameState(name); postScoreWithName(score, name); },
  });

  // Auto-heal stale linked profile — silently disconnects if the DB row is gone.
  useProfileVerification({
    profileLinked,
    deviceId,
    onDisconnect: disconnect,
  });

  function handleSaveName(name: string) {
    saveDisplayName(name);
    setDisplayNameState(name);
    postScoreWithName(score, name);
  }

  function handleSuggest(word: string) {
    setSuggestWord(word);
    setJustSuggested(null);
  }

  function handleSuggestSuccess(word: string) {
    markSuggested(word);
    setSuggestedWords((prev) => new Set([...prev, word.toLowerCase()]));
    setJustSuggested(word.toLowerCase());
    setSuggestWord(null);
  }

  // Stable ref keyboard pattern -- listener registered once, handler updated via layoutEffect.
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useLayoutEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      if (givenUp) return; // board is locked after give-up
      if (e.key === "Enter") {
        submitWord();
      } else if (e.key === "Backspace") {
        deleteLetter();
      } else if (/^\p{L}$/u.test(e.key)) {
        handleKeyboardLetter(e.key);
      }
    };
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const containerClass = "flex flex-col items-center gap-6 w-full max-w-sm mx-auto px-4 py-8";
  const buttonRowClass  = "flex items-center gap-2 w-full justify-center";

  return (
    <div data-testid="game-board" className={containerClass}>
      {/* Score + rank */}
      <ScoreBar
        score={score}
        maxScore={puzzleMaxScore}
        currentRank={currentRank}
        onOpenLeaderboard={isDaily ? () => setLeaderboardOpen(true) : undefined}
      />

      {/* Active game UI -- hidden once the player gives up */}
      {!givenUp && (
        <>
          <WordInput
            value={currentInput}
            centerLetter={activePuzzle.centerLetter}
            onSubmit={submitWord}
            canSubmit={currentInput.length >= 4}
          />

          {lastSubmission && (
            <FeedbackMessage
              word={lastSubmission.word}
              status={lastSubmission.result.status}
              points={lastSubmission.result.points}
              isPangram={lastSubmission.result.isPangram}
              onSuggest={() => handleSuggest(lastSubmission.word)}
              alreadySuggested={suggestedWords.has(lastSubmission.word.toLowerCase())}
              justSuggested={justSuggested === lastSubmission.word.toLowerCase()}
            />
          )}

          <NominationModal
            word={suggestWord ?? ""}
            direction="add"
            isOpen={suggestWord !== null}
            onClose={() => setSuggestWord(null)}
            onSuccess={handleSuggestSuccess}
          />

          <FlowerGrid
            centerLetter={activePuzzle.centerLetter}
            outerLetters={activePuzzle.outerLetters}
            onLetterClick={(l) => { setJustSuggested(null); addLetter(l); }}
            variant={variant}
          />

          <div className={buttonRowClass}>
            <button
              data-testid="btn-delete"
              onClick={deleteLetter}
              className={btnSecondary}
            >
              Διαγραφή
            </button>
            <button
              data-testid="btn-clear"
              onClick={clearInput}
              className={btnSecondary}
              aria-label="Clear input"
            >
              Καθαρισμός
            </button>
            <button
              data-testid="btn-shuffle"
              onClick={shuffleLetters}
              className={btnSecondary}
            >
              Ανακάτεμα
            </button>
          </div>
        </>
      )}

      {/* Give-up result banner */}
      {givenUp && (
        <div
          data-testid="give-up-banner"
          className="w-full rounded-2xl bg-stone-100 border border-stone-200 px-4 py-3 text-center space-y-1"
        >
          <p className="text-sm font-semibold text-stone-700">Το παιχνίδι τελείωσε</p>
          <p className="text-xs text-stone-500">
            Βρήκες{" "}
            <span className="font-bold text-stone-700">{foundWords.length}</span>
            {" "}από{" "}
            <span className="font-bold text-stone-700">{activePuzzle.validWords.length}</span>
            {" "}λέξεις
          </p>
          {isDaily && (
            <button
              data-testid="btn-leaderboard-given-up"
              onClick={() => setLeaderboardOpen(true)}
              className="mt-1 text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800 transition-colors"
            >
              🏆 Πίνακας Σκορ
            </button>
          )}
        </div>
      )}

      {/* Found words -- always visible; give-up button only for daily pre-give-up */}
      <FoundWordsList
        words={foundWords}
        puzzle={activePuzzle}
        onGiveUp={isDaily && !givenUp ? giveUp : undefined}
        givenUp={givenUp}
      />

      {/* Missed words -- only after giving up */}
      {givenUp && (
        <MissedWordsList puzzle={activePuzzle} foundWords={foundWords} />
      )}

      {/* Leaderboard modal -- only for daily puzzles */}
      {isDaily && (
        <LeaderboardModal
          isOpen={leaderboardOpen}
          defaultPuzzleId={leaderboardPuzzleId}
          recentDates={recentPuzzleDates}
          deviceId={deviceId}
          displayName={displayName}
          profileLinked={profileLinked}
          onSaveName={handleSaveName}
          onProfileCreate={createProfile}
          onTransferGenerate={generateTransferCode}
          onTransferClaim={claimTransferCode}
          onDisconnect={disconnect}
          onClose={() => setLeaderboardOpen(false)}
        />
      )}
    </div>
  );
}
