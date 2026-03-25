// page.tsx — server component entry point.
// Loads the puzzle on the server based on ?lang= and optional ?puzzle= params.
// ?lang=el          → today's Greek puzzle
// ?puzzle=2026-03-26-el → specific puzzle by ID

import { getNextPuzzle, getPuzzleById, getTodaysPuzzle } from "@/data";

import { GameBoard } from "@/components/GameBoard";
import type { Language } from "@/types";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; puzzle?: string }>;
}) {
  const { lang, puzzle: puzzleId } = await searchParams;

  const language: Language = lang === "en" ? "en" : "el";

  // Load a specific puzzle by ID if requested, otherwise load today's
  const puzzle = puzzleId
    ? (getPuzzleById(puzzleId, language) ?? getTodaysPuzzle(language))
    : getTodaysPuzzle(language);

  // Compute the next puzzle URL server-side so GameBoard just renders a link
  const nextPuzzle = getNextPuzzle(puzzle);
  const nextPuzzleUrl = nextPuzzle
    ? `/?lang=${language}&puzzle=${nextPuzzle.id}`
    : undefined;

  return (
    <div className="flex flex-col flex-1 items-center justify-start bg-zinc-50 font-sans min-h-screen">
      <header className="w-full border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <h1 className="text-xl font-bold tracking-tight text-stone-800">🍯 Spelling Bee</h1>
          {/* Language switcher — navigates to today's puzzle in the chosen language */}
          <div className="flex gap-2 text-sm font-medium">
            <a
              href="/?lang=en"
              data-testid="lang-en"
              className={language === "en"
                ? "px-3 py-1 rounded-full bg-stone-800 text-white"
                : "px-3 py-1 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100"}
            >
              EN
            </a>
            <a
              href="/"
              data-testid="lang-el"
              className={language === "el"
                ? "px-3 py-1 rounded-full bg-stone-800 text-white"
                : "px-3 py-1 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100"}
            >
              ΕΛ
            </a>
          </div>
        </div>
      </header>
      <main className="flex flex-1 w-full flex-col items-center bg-white">
        <GameBoard puzzle={puzzle} nextPuzzleUrl={nextPuzzleUrl} />
      </main>
    </div>
  );
}
