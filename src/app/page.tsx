// page.tsx — server component entry point.
// Loads today's puzzle on the server, then passes it to the client GameBoard.

import { GameBoard } from "@/components/GameBoard";
import { getTodaysPuzzle } from "@/data";

export default function Home() {
  // Puzzle is loaded at request time on the server — no client fetch needed
  const puzzle = getTodaysPuzzle("en");

  return (
    <div className="flex flex-col flex-1 items-center justify-start bg-zinc-50 font-sans min-h-screen">
      <header className="w-full border-b border-stone-200 bg-white px-4 py-3 text-center">
        <h1 className="text-xl font-bold tracking-tight text-stone-800">🍯 Spelling Bee</h1>
      </header>
      <main className="flex flex-1 w-full flex-col items-center bg-white">
        <GameBoard puzzle={puzzle} />
      </main>
    </div>
  );
}
