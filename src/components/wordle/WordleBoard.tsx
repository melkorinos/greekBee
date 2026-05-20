"use client";

// Top-level Wordle board — assembles GuessGrid + Keyboard + feedback message.
// Manages the active word length (4–8) with a - N + switcher.
// Wires physical keyboard events and leaderboard score submission.

import type { WordleLength, WordlePuzzle } from "@/games/wordle/types";
import { readSlice, writeSlice } from "@/hooks/useGameStore";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { FeedbackBanner } from "@/components/shared/FeedbackBanner";
import { GuessGrid } from "./GuessGrid";
import { Keyboard } from "./Keyboard";
import { WordleLeaderboardModal } from "./WordleLeaderboardModal";
import { normalizeLetters } from "@/games/spelling-bee/lib/normalize";
import { useWordleState } from "@/games/wordle/hooks/useWordleState";

// Greek letter regex (covers the Greek alphabet range)
const GREEK_LETTER = /^[α-ωά-ώΑ-ΩΆ-Ώ]$/i;

const LENGTHS: WordleLength[] = [4, 5, 6, 7, 8];

// ── Persistence slice for identity (device + display name) ────────────────────
interface WordleIdentitySlice {
  deviceId:    string;
  displayName: string;
}

function getOrCreateDeviceId(): string {
  const existing = readSlice<WordleIdentitySlice>("wordle-identity");
  if (existing?.deviceId) return existing.deviceId;
  const id = crypto.randomUUID();
  writeSlice("wordle-identity", { deviceId: id, displayName: "" });
  return id;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface WordleBoardProps {
  puzzles:   WordlePuzzle[];                      // one per length 4–8, server-provided
  wordLists: Record<WordleLength, string[]>;
  today:     string;                              // YYYY-MM-DD
}

// ── Inner game panel — one per length ────────────────────────────────────────
// Rendered for ALL lengths but only the active one is visible,
// so each instance maintains its own independent state.

interface LengthPanelProps {
  puzzle:      WordlePuzzle;
  validWords:  string[];
  isActive:    boolean;
  deviceId:    string;
  displayName: string;
  onGameEnd:   (length: WordleLength, attempts: number, won: boolean) => void;
}

function LengthPanel({
  puzzle,
  validWords,
  isActive,
  deviceId,
  displayName,
  onGameEnd,
}: LengthPanelProps) {
  const handleGameEnd = useCallback(
    (attempts: number, won: boolean) => onGameEnd(puzzle.length as WordleLength, attempts, won),
    [onGameEnd, puzzle.length]
  );

  const {
    guesses,
    currentInput,
    status,
    lastMessage,
    letterStates,
    maxGuesses,
    addLetter,
    deleteLetter,
    submitGuess,
    clearMessage,
  } = useWordleState(puzzle, validWords, handleGameEnd);

  // Physical keyboard — only active panel handles keys
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useLayoutEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      if (!isActive) return;
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

  if (!isActive) return null;

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="h-8">
        <FeedbackBanner
          message={lastMessage}
          variant={status === "won" ? "success" : status === "lost" ? "error" : "neutral"}
          theme="dark"
        />
      </div>
      <GuessGrid
        guesses={guesses}
        currentInput={currentInput}
        wordLength={puzzle.length}
        maxGuesses={maxGuesses}
        onSubmit={status === "playing" ? submitGuess : undefined}
      />
      <Keyboard
        letterStates={letterStates}
        onLetter={addLetter}
        onDelete={deleteLetter}
        onEnter={submitGuess}
        disabled={status !== "playing"}
      />
    </div>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────

export function WordleBoard({ puzzles, wordLists, today }: WordleBoardProps) {
  const [activeLength,    setActiveLength]    = useState<WordleLength>(4);
  const [lbOpen,          setLbOpen]          = useState(false);
  const [deviceId,        setDeviceId]        = useState("");
  const [displayName,     setDisplayName]     = useState("");

  // Hydrate identity on mount
  useEffect(() => {
    const id   = getOrCreateDeviceId();
    const sl   = readSlice<WordleIdentitySlice>("wordle-identity");
    setDeviceId(id);
    setDisplayName(sl?.displayName ?? "");
  }, []);

  function handleSaveName(name: string) {
    setDisplayName(name);
    writeSlice<WordleIdentitySlice>("wordle-identity", { deviceId, displayName: name });
    // Update display_name in any already-submitted scores for today
    // (fire-and-forget — not critical)
  }

  // Score submission: called by each LengthPanel when its game ends
  const handleGameEnd = useCallback(
    (length: WordleLength, attempts: number, won: boolean) => {
      const attemptsToSubmit = won ? attempts : 7; // failed = 7
      if (!deviceId) return;
      const sl = readSlice<WordleIdentitySlice>("wordle-identity");
      const name = sl?.displayName ?? "";
      void fetch("/api/wordle-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzle_date:  today,
          word_length:  length,
          device_id:    deviceId,
          display_name: name || "Ανώνυμος",
          attempts:     attemptsToSubmit,
        }),
      });
    },
    [deviceId, today]
  );

  // Length switcher — wraps around
  function prevLength() {
    setActiveLength((l) => {
      const idx = LENGTHS.indexOf(l);
      return LENGTHS[(idx - 1 + LENGTHS.length) % LENGTHS.length];
    });
  }
  function nextLength() {
    setActiveLength((l) => {
      const idx = LENGTHS.indexOf(l);
      return LENGTHS[(idx + 1) % LENGTHS.length];
    });
  }

  return (
    <>
      {/* ── Length switcher ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={prevLength}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 text-stone-100 text-lg font-bold transition-colors"
            aria-label="Μικρότερο μήκος"
          >
            −
          </button>
          <span className="text-stone-100 font-bold text-lg w-6 text-center tabular-nums">
            {activeLength}
          </span>
          <button
            onClick={nextLength}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 text-stone-100 text-lg font-bold transition-colors"
            aria-label="Μεγαλύτερο μήκος"
          >
            +
          </button>
        </div>

        {/* Leaderboard button */}
        <button
          onClick={() => setLbOpen(true)}
          className="text-stone-300 hover:text-stone-100 transition-colors text-xl"
          aria-label="Πίνακας σκορ"
          title="Πίνακας σκορ"
        >
          🏆
        </button>
      </div>

      {/* ── Length panels (all mounted, only active shown) ────────────────── */}
      {puzzles.map((puzzle) => (
        <LengthPanel
          key={puzzle.length}
          puzzle={puzzle}
          validWords={wordLists[puzzle.length as WordleLength]}
          isActive={puzzle.length === activeLength}
          deviceId={deviceId}
          displayName={displayName}
          onGameEnd={handleGameEnd}
        />
      ))}

      {/* ── Leaderboard modal ─────────────────────────────────────────────── */}
      <WordleLeaderboardModal
        isOpen={lbOpen}
        today={today}
        deviceId={deviceId}
        displayName={displayName}
        onSaveName={handleSaveName}
        onClose={() => setLbOpen(false)}
      />
    </>
  );
}

