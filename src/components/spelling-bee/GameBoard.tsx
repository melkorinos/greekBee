"use client";

// GameBoard — the top-level client component that composes all game UI pieces.
// Receives the initial puzzle as a prop (loaded server-side in page.tsx).

import { getDisplayName, getOrCreateDeviceId, setDisplayName as saveDisplayName } from "@/hooks/useGameStore";
import { getSuggestedWords, markSuggested } from "@/hooks/suggestions";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { FeedbackMessage } from "./FeedbackMessage";
import { FoundWordsList } from "./FoundWordsList";
import { HoneycombGrid } from "./HoneycombGrid";
import { LeaderboardModal } from "./LeaderboardModal";
import type { Puzzle } from "@/games/spelling-bee/types";
import { ScoreBar } from "./ScoreBar";
import { SuggestWordModal } from "./SuggestWordModal";
import { WordInput } from "./WordInput";
import { useGameState } from "@/games/spelling-bee/hooks/useGameState";

interface GameBoardProps {
  puzzle: Puzzle;
}

export function GameBoard({ puzzle }: GameBoardProps) {
  const {
    puzzle: activePuzzle,
    currentInput,
    foundWords,
    score,
    currentRank,
    puzzleMaxScore,
    lastSubmission,
    addLetter,
    deleteLetter,
    clearInput,
    submitWord,
    shuffleLetters,
    handleKeyboardLetter,
  } = useGameState(puzzle);

  // ── Word suggestion ────────────────────────────────────────────────────────
  // suggestWord: the word currently being proposed (null = modal closed)
  const [suggestWord,    setSuggestWord]    = useState<string | null>(null);
  // suggestedWords: Set of words already suggested by this device (from localStorage).
  // Lazy initializer reads localStorage once on mount — SSR-safe via window check.
  const [suggestedWords, setSuggestedWords] = useState<Set<string>>(
    () => typeof window === "undefined" ? new Set() : new Set(getSuggestedWords())
  );
  // justSuggested: word just submitted this session (show confirmation, not "Ήδη").
  // Cleared when the player types a new letter (suggestWord becomes null after success).
  const [justSuggested, setJustSuggested] = useState<string | null>(null);
  // ── Leaderboard ───────────────────────────────────────────────────────────
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [displayName, setDisplayNameState] = useState<string>(
    () => typeof window === "undefined" ? "" : getDisplayName()
  );
  const [deviceId] = useState<string>(
    () => typeof window === "undefined" ? "" : getOrCreateDeviceId()
  );

  // Only daily puzzles (YYYY-MM-DD) participate in the leaderboard.
  const isDailyPuzzle = /^\d{4}-\d{2}-\d{2}$/.test(activePuzzle.id);

  // Keep a ref so the score-submission effect always reads the latest name
  // without needing it as a dependency (avoids re-running on every name update).
  const displayNameRef = useRef(displayName);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

  // Track the last score we successfully posted so we only ever send higher values.
  const lastPostedScoreRef = useRef(0);

  // Silent upsert on every new word found — fires only when score strictly increases.
  useEffect(() => {
    if (!isDailyPuzzle || !deviceId) return;
    if (score <= 0 || score <= lastPostedScoreRef.current) return;
    lastPostedScoreRef.current = score;
    fetch("/api/scores", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzle_id:    activePuzzle.id,
        device_id:    deviceId,
        display_name: displayNameRef.current || "Ανώνυμος",
        score,
      }),
    }).catch(() => {}); // silently swallow network errors
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, isDailyPuzzle, activePuzzle.id, deviceId]);
  function handleSuggest(word: string) {
    setSuggestWord(word);
    setJustSuggested(null); // clear any previous confirmation
  }

  function handleSuggestSuccess() {
    if (suggestWord) {
      markSuggested(suggestWord);
      setSuggestedWords((prev) => new Set([...prev, suggestWord.toLowerCase()]));
      setJustSuggested(suggestWord.toLowerCase());
    }
    setSuggestWord(null);
  }

  // Called by LeaderboardModal when the player saves a new display name.
  // Updates localStorage, local state, and re-posts the current score with the new name.
  function handleSaveName(name: string) {
    saveDisplayName(name);
    setDisplayNameState(name);
    if (!isDailyPuzzle || !deviceId || score <= 0) return;
    fetch("/api/scores", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzle_id:    activePuzzle.id,
        device_id:    deviceId,
        display_name: name,
        score,
      }),
    }).catch(() => {});
  }

  // ── Keyboard support ───────────────────────────────────────────────────────
  // Stable ref pattern: the listener is registered exactly once (empty deps)
  // and always invokes the latest handler captured by useLayoutEffect.
  // This prevents rapid keystrokes being dropped during listener teardown/re-registration.
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useLayoutEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
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
  }, []); // registered once — ref keeps handler current


  // ── Class constants ──────────────────────────────────────────────────────────
  const styles = {
    container:
      "flex flex-col items-center gap-6 w-full max-w-sm mx-auto px-4 py-8",
    buttonRow: "flex items-center gap-2 w-full justify-center",
    buttonSecondary:
      "px-4 py-2 rounded-full border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-100 active:bg-stone-200 transition-colors",
    buttonPrimary:
      "px-8 py-2 rounded-full bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 active:bg-stone-900 transition-colors",
  };

  return (
    <div data-testid="game-board" className={styles.container}>
      {/* Score + rank */}
      <ScoreBar
        score={score}
        maxScore={puzzleMaxScore}
        currentRank={currentRank}
      />

      {/* Current word input display + inline submit button when word ≥4 letters */}
      <WordInput
        value={currentInput}
        centerLetter={activePuzzle.centerLetter}
        onSubmit={submitWord}
        canSubmit={currentInput.length >= 4}
      />

      {/* Feedback from the last submission — disappears on next input */}
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

      {/* Word suggestion modal — opened when player clicks “Πρότεινέ την” */}
      <SuggestWordModal
        word={suggestWord ?? ""}
        isOpen={suggestWord !== null}
        onClose={() => setSuggestWord(null)}
        onSuccess={handleSuggestSuccess}
      />

      {/* The 7-hex honeycomb grid */}
      <HoneycombGrid
        centerLetter={activePuzzle.centerLetter}
        outerLetters={activePuzzle.outerLetters}
        onLetterClick={(l) => { setJustSuggested(null); addLetter(l); }}
      />

      {/* Action buttons — secondary actions */}
      <div className={styles.buttonRow}>
        <button
          data-testid="btn-delete"
          onClick={deleteLetter}
          className={styles.buttonSecondary}
        >
          Διαγραφή
        </button>
        <button
          data-testid="btn-clear"
          onClick={clearInput}
          className={styles.buttonSecondary}
          aria-label="Clear input"
        >
          Καθαρισμός
        </button>
        <button
          data-testid="btn-shuffle"
          onClick={shuffleLetters}
          className={styles.buttonSecondary}
        >
          Ανακάτεμα
        </button>
        {isDailyPuzzle && (
          <button
            data-testid="btn-leaderboard"
            onClick={() => setLeaderboardOpen(true)}
            className={styles.buttonSecondary}
            aria-label="Πίνακας Σκορ"
          >
            🏆
          </button>
        )}
      </div>

      {/* Found words list */}
      <FoundWordsList words={foundWords} puzzle={activePuzzle} />

      {/* Leaderboard bottom-sheet — only for daily puzzles */}
      {isDailyPuzzle && (
        <LeaderboardModal
          isOpen={leaderboardOpen}
          defaultPuzzleId={activePuzzle.id}
          deviceId={deviceId}
          displayName={displayName}
          onSaveName={handleSaveName}
          onClose={() => setLeaderboardOpen(false)}
        />
      )}
    </div>
  );
}
