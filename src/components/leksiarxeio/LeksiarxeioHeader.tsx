"use client";

// Header row for the Leksiarxeio page: title, rules ?, and leaderboard 🏆 button.
// Lives in a client component so it can hold the open-leaderboard callback ref
// that LeksiarxeioBoard exposes.

import { HowToPlayModal } from "@/components/shared/HowToPlayModal";
import { LeksiarxeioBoard } from "./LeksiarxeioBoard";
import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";
import type { LeksiarxeioPuzzle } from "@/games/leksiarxeio/types";
import { useRef } from "react";

const LEKSIARXEIO_RULES = [
  "Μάντεψε τη λέξη της ημέρας σε **6 προσπάθειες**.",
  "Χρησιμοποίησε τα **- / +** για να αλλάξεις μήκος λέξης (4–8 γράμματα).",
  "Κάθε προσπάθεια πρέπει να είναι έγκυρη ελληνική λέξη του επιλεγμένου μήκους.",
  "🟩 **Πράσινο** = σωστό γράμμα στη σωστή θέση.",
  "🟨 **Κίτρινο** = σωστό γράμμα, λάθος θέση.",
  "⬛ **Γκρι** = το γράμμα δεν υπάρχει στη λέξη.",
  "Νέα λέξη κάθε μέρα για κάθε μήκος!",
  "🏆 Σκορ: 1 πόντος ανά προσπάθεια που έσωσες (max 6) × μήκος λέξης. Λιγότερες προσπάθειες = περισσότεροι πόντοι.",
];

interface LeksiarxeioPageClientProps {
  puzzles:   LeksiarxeioPuzzle[];
  wordLists: Record<LeksiarxeioLength, string[]>;
  today:     string;
}

export function LeksiarxeioPageClient({ puzzles, wordLists, today }: LeksiarxeioPageClientProps) {
  const openLbRef = useRef<(() => void) | null>(null);

  function handleOpenLeaderboardRef(fn: () => void) {
    openLbRef.current = fn;
  }

  return (
    <>
      <div className="flex items-center justify-between w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-stone-100">
          🟩 Leksiarxeio
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
            title="Πώς να παίξεις — Leksiarxeio"
            items={LEKSIARXEIO_RULES}
            bulletIcon="▸"
            lightTrigger
          />
        </div>
      </div>
      <LeksiarxeioBoard
        puzzles={puzzles}
        wordLists={wordLists}
        today={today}
        onOpenLeaderboardRef={handleOpenLeaderboardRef}
      />
    </>
  );
}
