// Wordle GR — server component.
// Loads all 5 daily puzzles (lengths 4–8) and passes them to the client board.
// The client manages which length is currently active.

import { WORDLE_LENGTHS, getAllTodaysWordlePuzzles, getTodayDateString, getValidWords } from "@/data/wordle";

import { HowToPlayModal } from "@/components/shared/HowToPlayModal";
import { WordleBoard } from "@/components/wordle/WordleBoard";
import type { WordleLength } from "@/games/wordle/types";

export const dynamic = "force-dynamic"; // Ensure fresh date on each request

const WORDLE_RULES = [
  "Μάντεψε τη λέξη της ημέρας σε **6 προσπάθειες**.",
  "Χρησιμοποίησε τα **- / +** για να αλλάξεις μήκος λέξης (4–8 γράμματα).",
  "Κάθε προσπάθεια πρέπει να είναι έγκυρη ελληνική λέξη του επιλεγμένου μήκους.",
  "🟩 **Πράσινο** = σωστό γράμμα στη σωστή θέση.",
  "🟨 **Κίτρινο** = σωστό γράμμα, λάθος θέση.",
  "⬛ **Γκρι** = το γράμμα δεν υπάρχει στη λέξη.",
  "Νέα λέξη κάθε μέρα για κάθε μήκος!",
];

export default function WordlePage() {
  const today   = getTodayDateString();
  const puzzles = getAllTodaysWordlePuzzles(today);
  const wordLists = Object.fromEntries(
    WORDLE_LENGTHS.map((l) => [l, getValidWords(l as WordleLength)])
  ) as Record<WordleLength, string[]>;

  return (
    <main className="flex flex-col items-center gap-2 px-4 pt-4 bg-zinc-900 text-stone-100">
      <div className="flex items-center justify-between w-full max-w-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-100">
            🟩 Wordle GR
          </h1>
        </div>
        <HowToPlayModal
          title="Πώς να παίξεις — Wordle GR"
          items={WORDLE_RULES}
          bulletIcon="▸"
          lightTrigger
        />
      </div>
      <WordleBoard puzzles={puzzles} wordLists={wordLists} today={today} />
    </main>
  );
}
