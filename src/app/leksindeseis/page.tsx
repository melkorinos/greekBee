// leksindeseis/page.tsx — Leksindeseis game page.

import { ConnectionsBoard }            from "./ConnectionsBoard";
import { HowToPlayModal }              from "@/components/shared/HowToPlayModal";
import { getTodaysLeksindeseisPuzzle } from "@/data/leksindeseis";

export const dynamic = "force-dynamic";

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

export default async function LeksindeseisPage() {
  const today = getTodayString();
  const { puzzle, submitter_name } = await getTodaysLeksindeseisPuzzle(today);

  return (
    <main className="flex flex-col items-center min-h-screen bg-background px-4 py-6">
      <div className="flex items-center justify-between w-full max-w-sm mb-1">
        <h1 className="text-2xl font-bold text-foreground">🔗 Leksindeseis</h1>
        <HowToPlayModal
          title="Πώς να παίξεις — Leksindeseis"
          items={CONNECTIONS_RULES}
          bulletIcon="🔗"
        />
      </div>
      <p className="text-muted text-xs mb-1 self-start max-w-sm">
        Ομαδοποίησε 16 λέξεις σε 4 κατηγορίες των 4
      </p>
      {submitter_name && (
        <p className="text-xs text-muted self-start max-w-sm mb-5">
          Παζλ από {submitter_name}
        </p>
      )}
      {puzzle ? (
        <ConnectionsBoard puzzle={puzzle} />
      ) : (
        <p className="text-muted text-sm mt-12">
          Δεν υπάρχει παζλ σήμερα.
        </p>
      )}
    </main>
  );
}
