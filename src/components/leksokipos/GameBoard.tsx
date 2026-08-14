"use client";

// GameBoard -- the top-level client component that composes all game UI pieces.
// Receives the initial puzzle as a prop (loaded server-side in page.tsx).

import { setDisplayName as saveDisplayName } from "@/hooks/useGameStore";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useProfileVerification } from "@/hooks/useProfileVerification";
import { usePhysicalKeyboard } from "@/hooks/usePhysicalKeyboard";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AchievementToast } from "./AchievementToast";
import { FeedbackMessage } from "./FeedbackMessage";
import { FoundWordsList } from "./FoundWordsList";
import { FlowerGridPlayground as FlowerGrid } from "./FlowerGridPlayground";
import { GiveUpModal } from "./GiveUpModal";
import { GodModeOverlay } from "./GodModeOverlay";
import { GameLeaderboardModal } from "@/components/shared/GameLeaderboardModal";
import { MissedWordsList } from "./MissedWordsList";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { ScoreBar } from "./ScoreBar";
import { NominationModal } from "@/components/shared/NominationModal";
import { WordInput } from "./WordInput";
import { btnSecondary, chipWarning } from "@/styles/recipes";
import { todayISO } from "@/lib/puzzleDate";
import { useAchievementSync } from "@/games/leksokipos/hooks/useAchievementSync";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import type { EarnedToast } from "@/games/leksokipos/lib/achievements";
import { useDayChange } from "@/games/leksokipos/hooks/useDayChange";
import { useGameState } from "@/games/leksokipos/hooks/useGameState";
import { useIsGodMode } from "@/games/leksokipos/hooks/useIsGodMode";
import { useWordSuggestions } from "@/games/leksokipos/hooks/useWordSuggestions";
import { useGameStateSync } from "@/hooks/useGameStateSync";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";
import { useSoundCue } from "@/hooks/useSoundCue";
import { selectSoundCue } from "@/games/leksokipos/lib/soundCue";
import { computeEndgameInfo, getRemainingWords, isDailyPuzzle, isPangram, TOP_RANK } from "@/games/leksokipos/lib";

interface GameBoardProps {
  puzzle: LeksokiposPuzzle;
  variant?: "pie" | "flower";
}

export function GameBoard({ puzzle, variant }: GameBoardProps) {
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
    restoreRound,
    godModeInject,
    resetGame,
  } = useGameState(puzzle);

  // God mode injects test words; gate anything that writes to the DB on it.
  // The 🧪 UI itself is self-gating — see GodModeOverlay at the bottom of the render.
  const isGodMode = useIsGodMode();

  // Redirect to today's puzzle if this page is a stale daily puzzle (day rolled over).
  // While Offline Mode is active the redirect is suppressed and this flag is raised
  // instead — the banner below explains why the puzzle is stale.
  const { dayChangedWhileOffline } = useDayChange(puzzle);

  // ── Endgame / all words found ───────────────────────────────────────────────
  const isDaily   = isDailyPuzzle(activePuzzle);
  const isEndgame = isDaily && currentRank === TOP_RANK;

  const remainingWords = useMemo(
    () => getRemainingWords(activePuzzle, foundWords),
    [activePuzzle, foundWords],
  );

  const allWordsFound = remainingWords.length === 0;

  // Pangrams found this round — feeds the achievement pangram-tier lane. Memoized on
  // [foundWords, activePuzzle] so a stable array ref doesn't re-fire the lane each render.
  const foundPangrams = useMemo(
    () => foundWords.filter((w) => isPangram(w, activePuzzle)),
    [foundWords, activePuzzle],
  );

  const endgameInfo = useMemo(
    () => isEndgame ? computeEndgameInfo(activePuzzle, remainingWords) : undefined,
    [isEndgame, activePuzzle, remainingWords],
  );

  const suggestions = useWordSuggestions();

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
  });

  // Per-score metadata for fairness analysis: how many words / pangrams this score
  // represents. Counts only — the word list never leaves the client (issue 10).
  const scoreData = useMemo(
    () => ({ words: foundWords.length, pangrams: foundPangrams.length }),
    [foundWords.length, foundPangrams.length],
  );

  // Auto-post whenever the score increases.
  useEffect(() => { postScore(score, scoreData); }, [score, scoreData, postScore]);

  // Sound Cues (ADR 0021). lastSubmission is a fresh object on every submit and is
  // deliberately never persisted, so it is already the event source — the reducer
  // needs no change. selectSoundCue owns which moments make a noise; play() is a
  // no-op while the preference is off.
  const { play: playCue } = useSoundCue();
  useEffect(() => {
    if (!lastSubmission) return;
    const cue = selectSoundCue(lastSubmission.result);
    if (cue) playCue(cue);
  }, [lastSubmission, playCue]);

  // Detect + post earned achievements as the game state crosses their thresholds,
  // and surface each genuinely-new badge as an in-game unlock toast.
  const [achievementToasts, setAchievementToasts] = useState<EarnedToast[]>([]);
  useAchievementSync({
    enabled: FEATURE_FLAGS.achievements,
    isDaily,
    isGodMode,
    deviceId,
    foundWords,
    foundPangrams,
    puzzleDate:     activePuzzle.date,
    validWordCount: activePuzzle.validWords.length,
    rank:           currentRank,
    onAchievementEarned: (badge) => setAchievementToasts((prev) => [...prev, badge]),
  });

  const { authLinked, authUserName, signInWithGoogle, signOut } = useAuth();

  const { profileLinked, createProfile, generateTransferCode, claimTransferCode, disconnect } = useProfile({
    deviceId,
    onDeviceIdChange:    setDeviceIdState,
    onDisplayNameChange: (name) => { setDisplayNameState(name); postScoreWithName(score, name, scoreData); },
  });

  // Cross-device sync — pushes state on every valid word, daily puzzles only.
  useGameStateSync({ puzzleDate: leaderboardPuzzleId, isDaily, foundWords, profileLinked });

  const handleTransferClaim = useCallback(async (code: string): Promise<void> => {
    await claimTransferCode(code);
    // force: the local round for this puzzle belongs to the pre-claim identity.
    await restoreRound({ force: true });
  }, [claimTransferCode, restoreRound]);

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

  usePhysicalKeyboard((e) => {
    if (givenUp || allWordsFound) return; // board locked after give-up or full completion
    if (e.key === "Enter") {
      submitWord();
    } else if (e.key === "Backspace") {
      deleteLetter();
    } else if (/^\p{L}$/u.test(e.key)) {
      handleKeyboardLetter(e.key);
    }
  });

  const containerClass = "flex flex-col items-center gap-6 w-full max-w-game mx-auto px-4 py-8";
  const buttonRowClass  = "flex items-center gap-2 w-full justify-center";

  return (
    <div data-testid="game-board" className={containerClass}>
      {/* Day rolled over while Offline Mode was active. The redirect that normally
          fetches the new puzzle is suppressed, so tell the player what happened and
          what to do — refreshing without a connection would end this round. */}
      {dayChangedWhileOffline && (
        <p
          data-testid="offline-day-changed"
          className={`${chipWarning} mb-3 rounded-lg px-3 py-2 text-sm leading-snug`}
        >
          Το σημερινό παζλ άλλαξε — τελείωσε τον γύρο σου και απενεργοποίησε τη
          λειτουργία εκτός σύνδεσης για να σταλεί το σκορ, μετά κάνε ανανέωση για το νέο παζλ.
        </p>
      )}

      {/* Unlock toasts — fixed stack, one per genuinely-new badge, self-dismissing.
          Gated behind the achievements flag; with it off the sync hook is inert and
          this list never fills, but gate the render too so intent is explicit. */}
      {FEATURE_FLAGS.achievements && achievementToasts.length > 0 && (
        <div className="fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
          {achievementToasts.map((badge) => (
            <AchievementToast
              key={badge.id}
              badge={badge}
              onDismiss={() =>
                setAchievementToasts((prev) => prev.filter((b) => b.id !== badge.id))
              }
            />
          ))}
        </div>
      )}

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
          {allWordsFound ? (
            /* All words found — round complete */
            <div
              data-testid="perfect-message"
              className="text-center font-bold text-2xl text-foreground py-2"
            >
              ΤΟ ΠΕΘΑΝΕΣ 🏆
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
                  onSuggest={() => suggestions.open(lastSubmission.word)}
                  alreadySuggested={suggestions.isSuggested(lastSubmission.word)}
                  justSuggested={suggestions.isJustSuggested(lastSubmission.word)}
                />
              )}
            </>
          )}

          <NominationModal
            word={suggestions.pendingWord ?? ""}
            direction="add"
            isOpen={suggestions.pendingWord !== null}
            onClose={suggestions.close}
            onSuccess={suggestions.confirm}
          />

          {/* Flower grid — always visible; non-interactive once all words are found */}
          <FlowerGrid
            centerLetter={activePuzzle.centerLetter}
            outerLetters={activePuzzle.outerLetters}
            onLetterClick={allWordsFound ? () => {} : (l) => { suggestions.clearConfirmation(); addLetter(l); }}
            variant={variant}
          />

          {!allWordsFound && (
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
        onGiveUp={isDaily && !givenUp && !allWordsFound ? () => setGiveUpModalOpen(true) : undefined}
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
        <GameLeaderboardModal
          gameId="leksokipos"
          isOpen={leaderboardOpen}
          today={todayISO()}
          defaultDate={leaderboardPuzzleId}
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

      {/* God mode — self-gating on ?godmode=zzkdgr3 */}
      <GodModeOverlay
        puzzle={activePuzzle}
        foundWords={foundWords}
        onInject={godModeInject}
        onReset={resetGame}
      />
    </div>
  );
}
