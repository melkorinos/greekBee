"use client";

import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";
import { usePhysicalKeyboard } from "@/hooks/usePhysicalKeyboard";
import { useEffect } from "react";

import { FeedbackBanner } from "@/components/shared/FeedbackBanner";
import { Keyboard } from "./Keyboard";
import { PhraseGrid } from "./PhraseGrid";
import { ShareResultPanel } from "@/components/shared/ShareResultPanel";
import { buildShareText } from "@/games/vrestifrasi/lib/shareText";
import { normalizeLetters } from "@/lib/normalize";
import { useVresTinFrasiState } from "@/games/vrestifrasi/hooks/useVresTinFrasiState";

const GREEK_LETTER = /^[α-ωά-ώΑ-ΩΆ-Ώ]$/i;

interface VresTinFrasiBoardProps {
  puzzle:     VresTinFrasiPuzzle;
  validWords: string[];
  today:      string;
}

export function VresTinFrasiBoard({
  puzzle,
  validWords,
  today,
}: VresTinFrasiBoardProps) {
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
  } = useVresTinFrasiState(puzzle, validWords);

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
    <div className="flex flex-col items-center gap-4 py-4 w-full">
        <div className="h-8">
          <FeedbackBanner
            message={lastMessage}
            variant={status === "won" ? "success" : status === "lost" ? "error" : "neutral"}
          />
        </div>

        <div className="w-full max-w-game flex flex-col items-center gap-4 px-2">
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

        {/* ── Result Panel (Round End: status leaves "playing", won or lost) ── */}
        {status !== "playing" && (
          <ShareResultPanel
            testId="vrestifrasi-result"
            shareText={buildShareText({ puzzle, guesses, status }, today)}
          >
            {/* The phrase is revealed HERE and only here — it stays on screen and
                never enters the shared text. With no score heading above it (ADR
                0027) this reveal IS the panel's heading, so it carries the size. */}
            <h2 className="text-2xl font-bold text-foreground text-center">
              {puzzle.phrase}
            </h2>
          </ShareResultPanel>
      )}
    </div>
  );
}
