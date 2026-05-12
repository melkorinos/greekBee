// spelling-bee/page.tsx — server component entry point for Spelling Bee.
// Loads the puzzle on the server based on optional ?puzzle= / ?random= / ?exclude= params.

import { getPuzzleById, getRandomPuzzle } from "@/data";

import { GameBoard } from "@/components/spelling-bee/GameBoard";
import { HowToPlayModal } from "@/components/spelling-bee/HowToPlayModal";
import type { Language } from "@/types";
import { NewPuzzleButton } from "@/components/spelling-bee/NewPuzzleButton";

export default async function SpellingBeePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; puzzle?: string; random?: string; exclude?: string }>;
}) {
  const { puzzle: puzzleId, random, exclude } = await searchParams;

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
          <div className="flex items-center gap-2">
            <NewPuzzleButton puzzleId={puzzle.id} language={language} />
            <HowToPlayModal />
          </div>
        </div>
      </header>
      <div className="flex flex-1 w-full flex-col items-center bg-white">
        <GameBoard puzzle={puzzle} />
      </div>
    </div>
  );
}
