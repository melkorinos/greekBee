// page.tsx — server component entry point.
// Loads today's puzzle on the server based on the ?lang= query param.
// Defaults to English. Pass ?lang=el for Greek.

import { GameBoard } from "@/components/GameBoard";
import { getTodaysPuzzle } from "@/data";
import type { Language } from "@/types";

// Next.js passes searchParams as a prop to server page components
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;

  // Only accept known language codes — fall back to English for anything else
  const language: Language = lang === "el" ? "el" : "en";
  const puzzle = getTodaysPuzzle(language);

  return (
    <div className="flex flex-col flex-1 items-center justify-start bg-zinc-50 font-sans min-h-screen">
      <header className="w-full border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <h1 className="text-xl font-bold tracking-tight text-stone-800">🍯 Spelling Bee</h1>
          {/* Language switcher — reloads the page with the chosen language */}
          <div className="flex gap-2 text-sm font-medium">
            <a
              href="/"
              data-testid="lang-en"
              className={language === "en"
                ? "px-3 py-1 rounded-full bg-stone-800 text-white"
                : "px-3 py-1 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100"}
            >
              EN
            </a>
            <a
              href="/?lang=el"
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
        <GameBoard puzzle={puzzle} />
      </main>
    </div>
  );
}
