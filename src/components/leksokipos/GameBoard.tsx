"use client";

// GameBoard -- the top-level client component that composes all game UI pieces.
// Receives the initial puzzle as a prop (loaded server-side in page.tsx).

import { setDisplayName as saveDisplayName } from "@/hooks/useGameStore";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useProfileVerification } from "@/hooks/useProfileVerification";
import { getSuggestedWords, markSuggested } from "@/hooks/suggestions";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { FeedbackMessage } from "./FeedbackMessage";
import { FoundWordsList } from "./FoundWordsList";
import { FlowerGridPlayground as FlowerGrid } from "./FlowerGridPlayground";
import { GiveUpModal } from "./GiveUpModal";
import { GodModePanel } from "./GodModePanel";
import { LeaderboardModal } from "./LeaderboardModal";
import { MissedWordsList } from "./MissedWordsList";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { ScoreBar } from "./ScoreBar";
import type { EndgameInfo } from "./ScoreBar";
import { NominationModal } from "@/components/shared/NominationModal";
import { WordInput } from "./WordInput";
import { btnSecondary } from "@/styles/recipes";
import { useDayChange } from "@/games/leksokipos/hooks/useDayChange";
import { useGameState } from "@/games/leksokipos/hooks/useGameState";
import { useGameStateSync } from "@/hooks/useGameStateSync";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";
import { isDailyPuzzle, isPangram } from "@/games/leksokipos/lib";

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
    restoreFromServer,
    godModeInject,
    resetGame,
  } = useGameState(puzzle);

  // God mode — activated by ?godmode=zzkdgr3 in the URL. Never posts to DB.
  const [isGodMode] = useState(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("godmode") === "zzkdgr3"
  );
  const [godModeOpen, setGodModeOpen] = useState(false);

  // Redirect to today's puzzle if this page is a stale daily puzzle (day rolled over).
  useDayChange(puzzle);

  // ── Endgame / Τζιμάνι ────────────────────────────────────────────────────
  const isDaily   = isDailyPuzzle(activePuzzle);
  const isEndgame = isDaily && score >= puzzleMaxScore;

  const foundWordsSet = useMemo(
    () => new Set(foundWords.map((w) => w.toLowerCase())),
    [foundWords],
  );

  const remainingWords = useMemo(
    () => activePuzzle.validWords.filter((w) => !foundWordsSet.has(w.toLowerCase())),
    [activePuzzle.validWords, foundWordsSet],
  );

  const isPerfect = remainingWords.length === 0;

  const endgameInfo = useMemo((): EndgameInfo | undefined => {
    if (!isEndgame) return undefined;
    const remainingPangrams = remainingWords.filter((w) => isPangram(w, activePuzzle)).length;
    const lengthMap = new Map<number, number>();
    for (const w of remainingWords) {
      lengthMap.set(w.length, (lengthMap.get(w.length) ?? 0) + 1);
    }
    const byLength = Array.from(lengthMap.entries())
      .sort(([a], [b]) => b - a)
      .map(([length, count]) => ({ length, count }));
    return { remainingTotal: remainingWords.length, remainingPangrams, byLength };
  }, [isEndgame, remainingWords, activePuzzle]);

  // Word suggestion
  const [suggestWord,    setSuggestWord]    = useState<string | null>(null);
  const [suggestedWords, setSuggestedWords] = useState<Set<string>>(
    () => typeof window === "undefined" ? new Set() : new Set(getSuggestedWords())
  );
  const [justSuggested, setJustSuggested] = useState<string | null>(null);

  // Leaderboard + profile
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [giveUpModalOpen, setGiveUpModalOpen] = useState(false);
  const { deviceId, displayName, setDeviceId: setDeviceIdState, setDisplayName: setDisplayNameState } = useGameIdentity();

  const leaderboardPuzzleId = activePuzzle.date;

  // Score submission -- all posting logic lives in the hook.
  // Disabled in god mode to prevent test data polluting the leaderboard.
  const { submit: postScore, submitWithName: postScoreWithName } = useScoreSubmission({
    gameId:      "leksokipos",
    puzzleDate:  leaderboardPuzzleId,
    deviceId,
    displayName,
    enabled:     isDaily && !isGodMode,
    isPerfect,
  });

  // Auto-post whenever the score increases.
  useEffect(() => { postScore(score); }, [score, postScore]);

  const { authLinked, authUserName, signInWithGoogle, signOut } = useAuth();

  const { profileLinked, createProfile, generateTransferCode, claimTransferCode, disconnect } = useProfile({
    deviceId,
    onDeviceIdChange:    setDeviceIdState,
    onDisplayNameChange: (name) => { setDisplayNameState(name); postScoreWithName(score, name); },
  });

  // Cross-device sync — pushes state on every valid word, daily puzzles only.
  useGameStateSync({ puzzleDate: leaderboardPuzzleId, isDaily, foundWords, profileLinked });

  const handleTransferClaim = useCallback(async (code: string): Promise<void> => {
    await claimTransferCode(code);
    await restoreFromServer();
  }, [claimTransferCode, restoreFromServer]);

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

  // Stable ref keyboard pattern — listener registered once, handler updated via layoutEffect.
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useLayoutEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      if (givenUp || isPerfect) return; // board locked after give-up or full completion
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
        endgameInfo={endgameInfo}
        onOpenLeaderboard={isDaily ? () => setLeaderboardOpen(true) : undefined}
      />

      {/* Active game UI -- hidden once the player gives up */}
      {!givenUp && (
        <>
          {isPerfect ? (
            /* Τζιμάνι — all words found */
            <div
              data-testid="perfect-message"
              className="text-center font-bold text-2xl text-foreground py-2"
            >
              ΤΟ ΠΕΘΑΝΕΣ 🏛️
            </div>
          ) : (
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
            </>
          )}

          <NominationModal
            word={suggestWord ?? ""}
            direction="add"
            isOpen={suggestWord !== null}
            onClose={() => setSuggestWord(null)}
            onSuccess={handleSuggestSuccess}
          />

          {/* Flower grid — always visible; non-interactive once Τζιμάνι achieved */}
          <FlowerGrid
            centerLetter={activePuzzle.centerLetter}
            outerLetters={activePuzzle.outerLetters}
            onLetterClick={isPerfect ? () => {} : (l) => { setJustSuggested(null); addLetter(l); }}
            variant={variant}
          />

          {!isPerfect && (
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
          )}
        </>
      )}

      {/* Give-up result banner */}
      {givenUp && (
        <div
          data-testid="give-up-banner"
          className="w-full rounded-2xl bg-surface-raised border border-border px-4 py-3 text-center space-y-1"
        >
          <p className="text-sm font-semibold text-foreground">Το παιχνίδι τελείωσε</p>
          <p className="text-xs text-muted">
            Βρήκες{" "}
            <span className="font-bold text-foreground">{foundWords.length}</span>
            {" "}από{" "}
            <span className="font-bold text-foreground">{activePuzzle.validWords.length}</span>
            {" "}λέξεις
          </p>
          {isDaily && (
            <button
              data-testid="btn-leaderboard-given-up"
              onClick={() => setLeaderboardOpen(true)}
              className="mt-1 text-xs text-muted underline underline-offset-2 hover:text-foreground transition-colors"
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
        onGiveUp={isDaily && !givenUp && !isPerfect ? () => setGiveUpModalOpen(true) : undefined}
        givenUp={givenUp}
      />

      {/* Missed words -- only after giving up */}
      {givenUp && (
        <MissedWordsList puzzle={activePuzzle} foundWords={foundWords} />
      )}

      {/* Give-up modal -- confirmation phase, then missed words on accept */}
      <GiveUpModal
        isOpen={giveUpModalOpen}
        onClose={() => setGiveUpModalOpen(false)}
        onConfirm={() => { giveUp(); }}
        givenUp={givenUp}
        puzzle={activePuzzle}
        foundWords={foundWords}
      />

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
          onTransferClaim={handleTransferClaim}
          onDisconnect={disconnect}
          authLinked={authLinked}
          authUserName={authUserName}
          onSignIn={signInWithGoogle}
          onSignOut={signOut}
          onClose={() => setLeaderboardOpen(false)}
        />
      )}

      {/* God mode — only when ?godmode=zzkdgr3 is in the URL */}
      {isGodMode && (
        <>
          <button
            data-testid="btn-god-mode"
            onClick={() => setGodModeOpen((v) => !v)}
            aria-label="God Mode"
            className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-surface border border-border shadow-lg flex items-center justify-center text-lg hover:bg-surface-raised transition-colors"
          >
            🧪
          </button>
          <GodModePanel
            isOpen={godModeOpen}
            onClose={() => setGodModeOpen(false)}
            puzzle={activePuzzle}
            foundWords={foundWords}
            onInject={godModeInject}
            onReset={resetGame}
          />
        </>
      )}
    </div>
  );
}
