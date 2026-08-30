"use client";

import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";
import { usePhysicalKeyboard } from "@/hooks/usePhysicalKeyboard";
import { useEffect, useRef } from "react";

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
    focusWord,
    submitGuess,
    clearMessage,
  } = useVresTinFrasiState(puzzle, validWords);

  usePhysicalKeyboard((e) => {
    if (e.key === "Enter")     return submitGuess();
    if (e.key === "Backspace") return deleteLetter();
    if (GREEK_LETTER.test(e.key)) addLetter(normalizeLetters(e.key));
  });

  const gridRef     = useRef<HTMLDivElement>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);

  /**
   * Keep the row being typed in the strip between the pinned header and the
   * pinned keyboard.
   *
   * The sticky keyboard guarantees the KEYS are always reachable; it does not
   * guarantee the player can see what those keys are writing. A six-row frame of
   * a three-line phrase is ~700px, so on a phone the active row is below the fold
   * from guess three onwards, and after a restore it is below the fold on load.
   *
   * Runs on the guess count, not on the cursor: a submit moves the active row
   * one down without the player scrolling, whereas a tap on a word is a tap on
   * something they could already see, and yanking the page under that tap is
   * exactly the "board shifts under the thumb" complaint the six-row frame exists
   * to prevent.
   *
   * In jsdom every rect is zero, so the "already visible" test below is true and
   * nothing is scrolled — no `window.scrollBy` stub warning in the unit suite.
   */
  useEffect(() => {
    const row = gridRef.current?.querySelector<HTMLElement>("[data-active-row]");
    const kb  = keyboardRef.current;
    if (!row || !kb) return;

    const rowBox       = row.getBoundingClientRect();
    const keyboardTop  = kb.getBoundingClientRect().top;
    const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;

    if (rowBox.top >= headerBottom && rowBox.bottom <= keyboardTop) return;

    const strip = keyboardTop - headerBottom;
    const GAP   = 8;
    // Land the row's bottom just above the keys; if the row is taller than the
    // strip (a phrase that wraps to three lines on a short screen) align its top
    // under the header instead, so the player reads it from the beginning.
    const delta = rowBox.height <= strip
      ? rowBox.bottom - keyboardTop + GAP
      : rowBox.top - headerBottom - GAP;

    window.scrollBy({ top: delta, behavior: "smooth" });
  }, [guesses.length]);

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
          <div ref={gridRef} className="w-full">
            <PhraseGrid
              guesses={guesses}
              currentWords={currentWords}
              currentWordIndex={currentWordIndex}
              wordLengths={puzzle.wordLengths}
              maxGuesses={maxGuesses}
              onFocusWord={focusWord}
            />
          </div>

          {/* Pin the keyboard to the bottom of the viewport so a tall phrase grid
              can't push it below the fold — the player always sees the keys and
              keeps the grid (what they're typing) in view. Scoped to this game.
              This was inert until 2026-08-29: `overflow-x: hidden` on `body` made
              it a scroll container that can never scroll, and sticky measures
              against the nearest scrollport. globals.css uses `clip` now — see the
              comment there before changing either. */}
          <div
            ref={keyboardRef}
            className="sticky bottom-0 z-20 w-full bg-background pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          >
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
            {/* The verdict, not the phrase. With no score heading above it (ADR
                0027) this line IS the panel's heading, so it carries the size.
                The phrase itself is no longer printed here (operator's call,
                2026-08-21): on a win the solved grid already spells it out, and it
                never enters the shared text either way — so on a LOSS the phrase
                now stays unrevealed. */}
            <h2 className="text-2xl font-bold text-foreground text-center">
              {status === "won" ? "Βρήκες τη φράση" : "Δεν βρήκες τη φράση"}
            </h2>
          </ShareResultPanel>
      )}
    </div>
  );
}
