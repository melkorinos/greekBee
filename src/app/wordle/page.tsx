// Wordle GR — server component.
// Loads today's puzzle and valid word list, then renders the client board.

import { getTodayDateString, getTodaysWordlePuzzle, getValidWords } from "@/data/wordle";

import { HowToPlayModal } from "@/components/shared/HowToPlayModal";
import { WordleBoard } from "@/components/wordle/WordleBoard";

export const dynamic = "force-dynamic"; // Ensure fresh date on each request

const WORDLE_RULES = [
  "Μάντεψε τη λέξη της ημέρας σε **6 προσπάθειες**.",
  "Κάθε προσπάθεια πρέπει να είναι έγκυρη 5γράμματη ελληνική λέξη.",
  "🟩 **Πράσινο** = σωστό γράμμα στη σωστή θέση.",
  "🟨 **Κίτρινο** = σωστό γράμμα, λάθος θέση.",
  "■ **Γκρι** = το γράμμα δεν υπάρχει στη λέξη.",
  "Χρησιμοποίησε το πληκτρολόγιο ή πληκτρολόγιο της οθόνης για να γράψεις γράμματα.",
  "Νέα λέξη κάθε μέρα!",
];

export default function WordlePage() {
  const today      = getTodayDateString();
  const puzzle     = getTodaysWordlePuzzle(today, 5);
  const validWords = getValidWords(5);

  return (
    <main className="flex flex-col items-center gap-2 px-4 pt-4 bg-zinc-900 text-stone-100">
      <div className="flex items-center justify-between w-full max-w-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-100">
            🟩 Wordle GR
          </h1>
          <p className="text-sm text-stone-400">
            {today} · 5 γράμματα · {validWords.length.toLocaleString()} λέξεις
          </p>
        </div>
        <HowToPlayModal
          title="Πώς να παίξεις — Wordle GR"
          items={WORDLE_RULES}
          bulletIcon="🟩"
          lightTrigger
        />
      </div>
      <WordleBoard puzzle={puzzle} validWords={validWords} />
    </main>
  );
}
