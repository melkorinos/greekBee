// connections/page.tsx — Connections game page.

import { ConnectionsBoard }           from "./ConnectionsBoard";
import { HowToPlayModal }             from "@/components/shared/HowToPlayModal";
import { getTodaysConnectionsPuzzle } from "@/data/connections";

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

const CONNECTIONS_RULES = [
  "Οι 16 λέξεις χωρίζονται σε **4 κατηγορίες των 4 λέξεων**.",
  "Επίλεξε 4 λέξεις που νομίζεις ότι ανήκουν μαζί και πάτησε **Υποβολή**.",
  "Οι κατηγορίες έχουν διαβαθμίσεις: κίτρινο = εύκολη, πράσινο, μπλε, **μοβ = δύσκολη**.",
  "Έχεις **4 λάθη** πριν τελειώσει το παιχνίδι.",
  "Αν είσαι **μία παραπάνω**, σου δίνουμε υπονόμευμα!",
  "Νέο παζλ κάθε μέρα!",
];

export default function ConnectionsPage() {
  const today  = getTodayString();
  const puzzle = getTodaysConnectionsPuzzle(today);

  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-6">
      <div className="flex items-center justify-between w-full max-w-sm mb-1">
        <h1 className="text-2xl font-bold text-stone-800">🔗 Connections</h1>
        <HowToPlayModal
          title="Πώς να παίξεις — Connections"
          items={CONNECTIONS_RULES}
          bulletIcon="🔗"
        />
      </div>
      <p className="text-stone-500 text-xs mb-6 self-start max-w-sm">
        Ομαδοποίησε 16 λέξεις σε 4 κατηγορίες των 4
      </p>
      <ConnectionsBoard puzzle={puzzle} />
    </main>
  );
}
