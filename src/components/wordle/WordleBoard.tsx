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
import { useWordleScoreSubmission } from "@/hooks/useWordleScoreSubmission";
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
  /** Ref callback so the page can inject a leaderboard-open trigger */
  onOpenLeaderboardRef?: (fn: () => void) => void;
}

// ── Inner game panel — one per length ────────────────────────────────────────
// Rendered for ALL lengths but only the active one is visible,
// so each instance maintains its own independent state.

interface LengthPanelProps {
  puzzle:        WordlePuzzle;
  validWords:    string[];
  isActive:      boolean;
  deviceId:      string;
  displayName:   string;
  activeLength:  WordleLength;
  onPrev:        () => void;
  onNext:        () => void;
  onGameEnd:     (length: WordleLength, attempts: number, won: boolean) => void;
}

function LengthPanel({
  puzzle,
  validWords,
  isActive,
  deviceId,
  displayName,
  activeLength,
  onPrev,
  onNext,
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
    // w-full gives the flex column a definite width on wide screens.
    <div className="flex flex-col items-center gap-4 py-4 w-full">
      <div className="h-8">
        <FeedbackBanner
          message={lastMessage}
          variant={status === "won" ? "success" : status === "lost" ? "error" : "neutral"}
          theme="dark"
        />
      </div>

      {/*
        Single max-w-sm column: grid + switcher + keyboard all share the same
        384 px bounding box so their left/right edges always line up on any
        screen width. Without this common ancestor, the grid (w-fit) and the
        keyboard (w-full max-w-sm) centre independently and appear offset on PC.
      */}
      <div className="w-full max-w-sm flex flex-col items-center gap-4 px-2">
        {/* Grid fills the shared max-w-sm column via flex-1 tiles — no overflow possible */}
        <GuessGrid
          guesses={guesses}
          currentInput={currentInput}
          wordLength={puzzle.length}
          maxGuesses={maxGuesses}
        />

        {/* Length switcher — lives between grid and keyboard so the player
            can see the current level and change it without looking away from
            where they are typing. */}
        <div className="flex items-center gap-4">
          <button
            onClick={onPrev}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 text-stone-100 text-lg font-bold transition-colors"
            aria-label="Μικρότερο μήκος"
          >
            −
          </button>
          <span className="text-stone-100 font-bold text-lg w-6 text-center tabular-nums">
            {activeLength}
          </span>
          <button
            onClick={onNext}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 text-stone-100 text-lg font-bold transition-colors"
            aria-label="Μεγαλύτερο μήκος"
          >
            +
          </button>
        </div>

        {/* Keyboard — w-full fills the shared max-w-sm column exactly,
            so its edges align with the grid rows above. */}
        <Keyboard
          letterStates={letterStates}
          onLetter={addLetter}
          onDelete={deleteLetter}
          onEnter={submitGuess}
          disabled={status !== "playing"}
        />
      </div>
    </div>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────

export function WordleBoard({ puzzles, wordLists, today, onOpenLeaderboardRef }: WordleBoardProps) {
  const [activeLength,    setActiveLength]    = useState<WordleLength>(4);
  const [lbOpen,          setLbOpen]          = useState(false);
  const [deviceId,        setDeviceId]        = useState("");
  const [displayName,     setDisplayName]     = useState("");

  // Expose the open function to the parent via ref callback
  useEffect(() => {
    onOpenLeaderboardRef?.(() => setLbOpen(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track which lengths are finished (won or lost) so auto-advance can skip them.
  // A ref is used alongside state to avoid stale-closure issues inside setTimeout.
  const completedRef = useRef(new Set<WordleLength>());
  const [, setCompletedLengths] = useState<Set<WordleLength>>(new Set());

  // Hydrate identity on mount
  useEffect(() => {
    const id   = getOrCreateDeviceId();
    const sl   = readSlice<WordleIdentitySlice>("wordle-identity");
    setDeviceId(id);
    setDisplayName(sl?.displayName ?? "");
  }, []);

  // Restore already-completed lengths from persistence so auto-advance skips them.
  // The Wordle slice is a SessionMap keyed by puzzle ID (e.g. "2026-05-22-wordle-5").
  useEffect(() => {
    const store = readSlice<Record<string, { status: string }>>("wordle");
    if (!store) return;
    const done = new Set<WordleLength>();
    for (const p of puzzles) {
      const session = store[p.id];
      if (session && session.status !== "playing") {
        done.add(p.length as WordleLength);
      }
    }
    completedRef.current = done;
    setCompletedLengths(new Set(done));
  // Intentionally runs once on mount — puzzles is stable (server-provided)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSaveName(name: string) {
    setDisplayName(name);
    writeSlice<WordleIdentitySlice>("wordle-identity", { deviceId, displayName: name });
    // Update display_name in any already-submitted scores for today
    // (fire-and-forget — not critical)
  }

  // Score submission -- all posting logic lives in the hook.
  const { submit: postWordleScore } = useWordleScoreSubmission({ today, deviceId });

  // Score submission + auto-advance: called by each LengthPanel when its game ends.
  //
  // Auto-advance design:
  //   1. Mark this length as completed in the ref immediately (avoids stale closure
  //      inside the timeout — using a ref means the timeout callback always reads
  //      the latest Set, not the value at callback-creation time).
  //   2. After 1.5 s, search forward (wrapping) for the first unfinished length.
  //      "Skip already-completed" means the player goes straight to their next
  //      unsolved word instead of revisiting finished rounds.
  //   3. If everything is done (or this was the last round): open the leaderboard.
  const handleGameEnd = useCallback(
    (length: WordleLength, attempts: number, won: boolean) => {
      postWordleScore(length, attempts, won);

      // Update the ref first so the timeout closure sees the fresh set.
      const newCompleted = new Set([...completedRef.current, length]);
      completedRef.current = newCompleted;
      setCompletedLengths(new Set(newCompleted));

      setTimeout(() => {
        const completed = completedRef.current;
        const currentIdx = LENGTHS.indexOf(length);
        let next: WordleLength | null = null;

        // Walk forward through LENGTHS (wrapping), pick first unfinished.
        for (let i = 1; i < LENGTHS.length; i++) {
          const candidate = LENGTHS[(currentIdx + i) % LENGTHS.length];
          if (!completed.has(candidate)) {
            next = candidate;
            break;
          }
        }

        if (next) {
          setActiveLength(next);
        } else {
          // All lengths finished — surface the leaderboard.
          setLbOpen(true);
        }
      }, 1500);
    },
    [postWordleScore]
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
      {/* ── Length panels (all mounted, only active shown) ────────────────── */}
      {puzzles.map((puzzle) => (
        <LengthPanel
          key={puzzle.length}
          puzzle={puzzle}
          validWords={wordLists[puzzle.length as WordleLength]}
          isActive={puzzle.length === activeLength}
          deviceId={deviceId}
          displayName={displayName}
          activeLength={activeLength}
          onPrev={prevLength}
          onNext={nextLength}
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

