// Λεξόπλεγμα — server component.
// Resolves today's date → deterministic daily puzzle (rotation over the
// committed generator batch + the Leksiarxeio same-day answer guard — static
// JSON only, no words-el.json anywhere near this route, no DB).

import { getPuzzleForDate, getTodayDateString } from "@/data/leksoplegma";

import { LeksoplegmaPageClient } from "@/components/leksoplegma/LeksoplegmaPageClient";

export const dynamic = "force-dynamic";

export default function LeksoplegmaPage() {
  const today = getTodayDateString();
  const puzzle = getPuzzleForDate(today);

  return (
    <main data-game="leksoplegma" className="flex flex-1 flex-col items-center gap-2 px-4 pt-4 bg-background text-foreground">
      <LeksoplegmaPageClient puzzle={puzzle} today={today} />
    </main>
  );
}
