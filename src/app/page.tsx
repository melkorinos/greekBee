// page.tsx — server component entry point.
// Loads the puzzle on the server based on ?lang= and optional ?puzzle= / ?random= params.
// ?lang=el                   → random Greek puzzle (default)
// ?puzzle=2026-03-26-el      → specific puzzle by ID
// ?random=1&exclude=some-id  → random puzzle (skips the excluded ID)

import { getPuzzleById, getRandomPuzzle } from "@/data";

import { GameBoard } from "@/components/GameBoard";
import { HowToPlayModal } from "@/components/HowToPlayModal";
import type { Language } from "@/types";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; puzzle?: string; random?: string; exclude?: string }>;
}) {
  const { lang, puzzle: puzzleId, random, exclude } = await searchParams;

  const language: Language = "el";

  // Load puzzle: specific ID → random (always — excluding current if provided)
  const puzzle =
    puzzleId ? (getPuzzleById(puzzleId, language) ?? getRandomPuzzle(language))
    :           getRandomPuzzle(language, exclude);

  return (
    <div className="flex flex-col flex-1 items-center justify-start bg-zinc-50 font-sans min-h-screen">
      <header className="w-full border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <h1 className="text-xl font-bold tracking-tight text-stone-800">🍯 Spelling Bee</h1>
          {/* Language switcher — navigates to today's puzzle in the chosen language */}
          <HowToPlayModal />
        </div>
      </header>
      <main className="flex flex-1 w-full flex-col items-center bg-white">
        <GameBoard puzzle={puzzle} />
      </main>
    </div>
  );
}
