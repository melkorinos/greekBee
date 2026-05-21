"use client";

// Header row for the Wordle page: title, rules ?, and leaderboard 🏆 button.
// Lives in a client component so it can hold the open-leaderboard callback ref
// that WordleBoard exposes.

import { HowToPlayModal } from "@/components/shared/HowToPlayModal";
import { WordleBoard } from "./WordleBoard";
import type { WordleLength } from "@/games/wordle/types";
import type { WordlePuzzle } from "@/games/wordle/types";
import { useRef } from "react";

const WORDLE_RULES = [
  "Μάντεψε τη λέξη της ημέρας σε **6 προσπάθειες**.",
  "Χρησιμοποίησε τα **- / +** για να αλλάξεις μήκος λέξης (4–8 γράμματα).",
  "Κάθε προσπάθεια πρέπει να είναι έγκυρη ελληνική λέξη του επιλεγμένου μήκους.",
  "🟩 **Πράσινο** = σωστό γράμμα στη σωστή θέση.",
  "🟨 **Κίτρινο** = σωστό γράμμα, λάθος θέση.",
  "⬛ **Γκρι** = το γράμμα δεν υπάρχει στη λέξη.",
  "Νέα λέξη κάθε μέρα για κάθε μήκος!",
  "🏆 Σκορ: 1 πόντος ανά προσπάθεια που έσωσες (max 6) × μήκος λέξης. Λιγότερες προσπάθειες = περισσότεροι πόντοι.",
];

interface WordlePageClientProps {
  puzzles:   WordlePuzzle[];
  wordLists: Record<WordleLength, string[]>;
  today:     string;
}

export function WordlePageClient({ puzzles, wordLists, today }: WordlePageClientProps) {
  const openLbRef = useRef<(() => void) | null>(null);

  function handleOpenLeaderboardRef(fn: () => void) {
    openLbRef.current = fn;
  }

  return (
    <>
      <div className="flex items-center justify-between w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-stone-100">
          🟩 Wordle GR
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openLbRef.current?.()}
            className="text-stone-300 hover:text-stone-100 transition-colors text-xl"
            aria-label="Πίνακας σκορ"
            title="Πίνακας σκορ"
          >
            🏆
          </button>
          <HowToPlayModal
            title="Πώς να παίξεις — Wordle GR"
            items={WORDLE_RULES}
            bulletIcon="▸"
            lightTrigger
          />
        </div>
      </div>
      <WordleBoard
        puzzles={puzzles}
        wordLists={wordLists}
        today={today}
        onOpenLeaderboardRef={handleOpenLeaderboardRef}
      />
    </>
  );
}
