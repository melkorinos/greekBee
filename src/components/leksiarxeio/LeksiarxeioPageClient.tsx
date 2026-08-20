"use client";

import { HowToPlayModal } from "@/components/shared/HowToPlayModal";
import { GAME_REGISTRY } from "@/config/games";
import { GameHeader } from "@/components/shared/GameHeader";
import { LeksiarxeioBoard } from "./LeksiarxeioBoard";
import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";
import type { LeksiarxeioPuzzle } from "@/games/leksiarxeio/types";

const LEKSIARXEIO_RULES = [
  "Μάντεψε τη λέξη της ημέρας σε **6 προσπάθειες**.",
  "Χρησιμοποίησε τα **- / +** για να αλλάξεις μήκος λέξης (4–8 γράμματα).",
  "Κάθε προσπάθεια πρέπει να είναι έγκυρη ελληνική λέξη του επιλεγμένου μήκους.",
  "🟩 **Πράσινο** = σωστό γράμμα στη σωστή θέση.",
  "🟨 **Κίτρινο** = σωστό γράμμα, λάθος θέση.",
  "⬛ **Γκρι** = το γράμμα δεν υπάρχει στη λέξη.",
  "Νέα λέξη κάθε μέρα για κάθε μήκος!",
];

interface LeksiarxeioPageClientProps {
  puzzles:   LeksiarxeioPuzzle[];
  wordLists: Record<LeksiarxeioLength, string[]>;
  today:     string;
}

export function LeksiarxeioPageClient({ puzzles, wordLists, today }: LeksiarxeioPageClientProps) {
  return (
    <>
      {/* No 🏆 trigger: the Game has no leaderboard capability (ADR 0027). This
          header is hand-wired rather than GamePageChrome's — Λεξιαρχείο stays out
          of that component — so the button is removed here, not derived. */}
      <GameHeader title="✏️ Leksiarxeio">
        <HowToPlayModal
          title="Πώς να παίξεις — Leksiarxeio"
          items={LEKSIARXEIO_RULES}
          bulletIcon={GAME_REGISTRY.leksiarxeio.emoji}
        />
      </GameHeader>
      <LeksiarxeioBoard
        puzzles={puzzles}
        wordLists={wordLists}
        today={today}
      />
    </>
  );
}
