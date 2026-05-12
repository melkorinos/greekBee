// app/page.tsx — game picker home page.
// Minimal cards for each game; will be polished in Phase 4.

import Link from "next/link";

const GAMES = [
  {
    id: "spelling-bee",
    emoji: "🍯",
    title: "Spelling Bee",
    description: "Βρες λέξεις με τα 7 γράμματα της κηρήθρας.",
    href: "/spelling-bee",
    available: true,
  },
  {
    id: "wordle",
    emoji: "🟩",
    title: "Wordle GR",
    description: "Μάντεψε τη λέξη σε 6 προσπάθειες — 5 γράμματα.",
    href: "/wordle",
    available: true,
  },
  {
    id: "connections",
    emoji: "🔗",
    title: "Connections",
    description: "Ομαδοποίησε 16 λέξεις σε 4 κατηγορίες των 4.",
    href: "/connections",
    available: true,
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-zinc-50 px-4 py-12">
      <h1 className="text-3xl font-bold text-stone-800 mb-2">Παιχνίδια Λέξεων</h1>
      <p className="text-stone-500 text-sm mb-10">Επίλεξε παιχνίδι για να ξεκινήσεις</p>

      <ul className="w-full max-w-sm space-y-4">
        {GAMES.map((game) => (
          <li key={game.id}>
            {game.available ? (
              <Link
                href={game.href}
                className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300 transition-all"
              >
                <span className="text-3xl mt-0.5">{game.emoji}</span>
                <div>
                  <p className="font-semibold text-stone-800">{game.title}</p>
                  <p className="text-sm text-stone-500 mt-0.5">{game.description}</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-stone-200 opacity-50 cursor-not-allowed select-none">
                <span className="text-3xl mt-0.5">{game.emoji}</span>
                <div>
                  <p className="font-semibold text-stone-800">
                    {game.title}{" "}
                    <span className="text-xs font-normal text-stone-400 ml-1">Σύντομα</span>
                  </p>
                  <p className="text-sm text-stone-500 mt-0.5">{game.description}</p>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
