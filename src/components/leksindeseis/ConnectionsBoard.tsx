"use client";

// ConnectionsBoard — client component that owns game state.
// Imported by the server-rendered leksindeseis/page.tsx.

import { useCallback, useEffect, useRef, useState } from "react";

import type { LeksindeseisPuzzle }           from "@/games/leksindeseis/types";
import { ConnectionsLeaderboardModal }      from "@/components/leksindeseis/ConnectionsLeaderboardModal";
import { FeedbackBanner }                  from "@/components/shared/FeedbackBanner";
import { GroupGrid }                       from "@/components/leksindeseis/GroupGrid";
import { setDisplayName } from "@/hooks/useGameStore";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { useProfile } from "@/hooks/useProfile";
import { useScoreSubmission }              from "@/hooks/useScoreSubmission";
import { useLeksindeseisState }            from "@/games/leksindeseis/hooks/useLeksindeseisState";

interface ConnectionsBoardProps {
  puzzle: LeksindeseisPuzzle;
}

// Mistake dots — filled = mistake used, outline = remaining
function MistakeDots({ remaining, max = 4 }: { remaining: number; max?: number }) {
  return (
    <div className="flex gap-2 items-center" aria-label={`${remaining} λάθη απομένουν`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={[
            "w-3 h-3 rounded-full border-2",
            i < remaining
              ? "bg-stone-600 border-stone-600 dark:bg-stone-400 dark:border-stone-400"
              : "border-stone-400 dark:border-stone-600 bg-transparent",
          ].join(" ")}
        />
      ))}
      <span className="text-xs text-stone-500 dark:text-stone-400 ml-1">λάθη απομένουν</span>
    </div>
  );
}

export function ConnectionsBoard({ puzzle }: ConnectionsBoardProps) {
  const {
    solvedGroups,
    currentSelection,
    mistakesRemaining,
    status,
    lastFeedback,
    displayOrder,
    selectWord,
    submitGuess,
    shuffleWords,
    clearFeedback,
  } = useLeksindeseisState(puzzle);

  // ── Identity ────────────────────────────────────────────────────────────────
  const { deviceId, displayName, setDeviceId: setDeviceIdState, setDisplayName: setDisplayNameState } = useGameIdentity();

  // ── Score submission ─────────────────────────────────────────────────────────
  const { submit: postScore, submitWithName } = useScoreSubmission({
    gameId:      "leksindeseis",
    puzzleDate:  puzzle.date,
    deviceId:    deviceId,
    displayName: displayName,
  });

  const { profileLinked, createProfile, generateTransferCode, claimTransferCode, disconnect } = useProfile({
    deviceId,
    onDeviceIdChange:    setDeviceIdState,
    onDisplayNameChange: (name) => {
      setDisplayNameState(name);
      if (status === "won") submitWithName(mistakesRemaining, name);
    },
  });

  function handleSaveName(name: string) {
    setDisplayNameState(name);
    setDisplayName(name);
    if (status === "won") submitWithName(mistakesRemaining, name);
  }

  // Fire once when the game transitions to "won"
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === "playing" && status === "won") {
      postScore(mistakesRemaining);
    }
    prevStatusRef.current = status;
  }, [status, mistakesRemaining, postScore]);

  // ── Leaderboard modal ────────────────────────────────────────────────────────
  const [lbOpen, setLbOpen] = useState(false);

  // Auto-clear feedback after 2 s
  useEffect(() => {
    if (!lastFeedback) return;
    const t = setTimeout(clearFeedback, 2000);
    return () => clearTimeout(t);
  }, [lastFeedback, clearFeedback]);

  const feedbackVariant = useCallback((): "success" | "error" | "neutral" => {
    if (!lastFeedback) return "neutral";
    if (lastFeedback.startsWith("✅") || lastFeedback.includes("Μπράβο")) return "success";
    if (lastFeedback.includes("😔")) return "error";
    return "neutral";
  }, [lastFeedback]);

  const isPlaying = status === "playing";

  return (
    <div className="w-full max-w-sm flex flex-col gap-4">
      {/* 🏆 leaderboard button — shown once game ends */}
      {status !== "playing" && (
        <div className="flex justify-end">
          <button
            onClick={() => setLbOpen(true)}
            className="text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 text-sm font-medium transition-colors"
            aria-label="Άνοιγμα κατάταξης"
          >
            🏆 Κατάταξη
          </button>
        </div>
      )}

      {/* Solved group reveal + unsolved word grid */}
      <GroupGrid
        displayOrder={displayOrder}
        currentSelection={currentSelection}
        solvedGroups={solvedGroups}
        disabled={!isPlaying}
        onSelect={selectWord}
      />

      {/* Feedback banner */}
      <div className="h-8 flex items-center justify-center">
        <FeedbackBanner
          message={lastFeedback}
          variant={feedbackVariant()}
          theme="light"
        />
      </div>

      {/* Mistake tracker */}
      {isPlaying && <MistakeDots remaining={mistakesRemaining} />}

      {/* Action buttons */}
      {isPlaying && (
        <div className="flex gap-2 justify-center">
          <button
            onClick={shuffleWords}
            className="px-4 py-2 rounded border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Ανακάτεμα
          </button>
          <button
            onClick={submitGuess}
            disabled={currentSelection.length !== 4}
            className={[
              "px-4 py-2 rounded text-sm font-semibold transition-colors",
              currentSelection.length === 4
                ? "bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-100"
                : "bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed",
            ].join(" ")}
          >
            Υποβολή
          </button>
        </div>
      )}

      {/* End state message */}
      {status === "won" && (
        <p className="text-center text-green-700 dark:text-green-400 font-bold text-lg">
          Συγχαρητήρια! 🎉
        </p>
      )}
      {status === "lost" && (
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="font-bold">Δεν τα κατάφερες αυτή τη φορά 😔</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Ξαναπαίξε αύριο!</p>
        </div>
      )}

      {/* Leaderboard modal */}
      <ConnectionsLeaderboardModal
        isOpen={lbOpen}
        date={puzzle.date}
        deviceId={deviceId}
        displayName={displayName}
        score={status === "won" ? mistakesRemaining : 0}
        profileLinked={profileLinked}
        onSaveName={handleSaveName}
        onProfileCreate={createProfile}
        onTransferGenerate={generateTransferCode}
        onTransferClaim={claimTransferCode}
        onDisconnect={disconnect}
        onClose={() => setLbOpen(false)}
      />
    </div>
  );
}
