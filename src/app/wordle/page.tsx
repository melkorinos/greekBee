// Wordle GR — server component.
// Loads today's puzzle and valid word list, then renders the client board.

import { getTodayDateString, getTodaysWordlePuzzle, getValidWords } from "@/data/wordle";

import { WordleBoard } from "@/components/wordle/WordleBoard";

export const dynamic = "force-dynamic"; // Ensure fresh date on each request

export default function WordlePage() {
  const today      = getTodayDateString();
  const puzzle     = getTodaysWordlePuzzle(today, 5);
  const validWords = getValidWords(5);

  return (
    <main className="flex flex-col items-center gap-2 px-4 pt-4">
      <h1 className="text-2xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
        🟩 Wordle GR
      </h1>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {today} · 5 γράμματα · {validWords.length.toLocaleString()} λέξεις
      </p>
      <WordleBoard puzzle={puzzle} validWords={validWords} />
    </main>
  );
}
