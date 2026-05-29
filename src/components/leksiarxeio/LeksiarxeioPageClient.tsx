"use client";

import { HowToPlayModal } from "@/components/shared/HowToPlayModal";
import { LeksiarxeioBoard } from "./LeksiarxeioBoard";
import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";
import type { LeksiarxeioPuzzle } from "@/games/leksiarxeio/types";
import { useState } from "react";

const LEKSIARXEIO_RULES = [
  "Μάντεψε τη λέξη της ημέρας σε **6 προσπάθειες**.",
  "Χρησιμοποίησε τα **- / +** για να αλλάξεις μήκος λέξης (4–8 γράμματα).",
  "Κάθε προσπάθεια πρέπει να είναι έγκυρη ελληνική λέξη του επιλεγμένου μήκους.",
  "🟩 **Πράσινο** = σωστό γράμμα στη σωστή θέση.",
  "🟨 **Κίτρινο** = σωστό γράμμα, λάθος θέση.",
  "⬛ **Γκρι** = το γράμμα δεν υπάρχει στη λέξη.",
  "Νέα λέξη κάθε μέρα για κάθε μήκος!",
  "🏆 **Σκορ**: **6 πόντοι** αν μαντέψεις στην 1η προσπάθεια, **5** στη 2η, μέχρι **1** στην 6η. Αποτυχία = 0. Το σκορ είναι το άθροισμα και για τα 5 μήκη. **Υψηλότερο = καλύτερο!**",
];

interface LeksiarxeioPageClientProps {
  puzzles:   LeksiarxeioPuzzle[];
  wordLists: Record<LeksiarxeioLength, string[]>;
  today:     string;
}

export function LeksiarxeioPageClient({ puzzles, wordLists, today }: LeksiarxeioPageClientProps) {
  const [lbOpen, setLbOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
          ✏️ Leksiarxeio
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLbOpen(true)}
            className="text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 transition-colors text-xl"
            aria-label="Πίνακας σκορ"
            title="Πίνακας σκορ"
          >
            🏆
          </button>
          <HowToPlayModal
            title="Πώς να παίξεις — Leksiarxeio"
            items={LEKSIARXEIO_RULES}
            bulletIcon="▸"
          />
        </div>
      </div>
      <LeksiarxeioBoard
        puzzles={puzzles}
        wordLists={wordLists}
        today={today}
        isLeaderboardOpen={lbOpen}
        onOpenLeaderboard={() => setLbOpen(true)}
        onCloseLeaderboard={() => setLbOpen(false)}
      />
    </>
  );
}
