// leksindeseis/page.tsx — Leksindeseis game page.

import { ConnectionsBoard }            from "./ConnectionsBoard";
import { HowToPlayModal }              from "@/components/shared/HowToPlayModal";
import { GamePageShell }               from "@/components/shared/GamePageShell";
import { GameHeader }                  from "@/components/shared/GameHeader";
import { getTodaysLeksindeseisPuzzle } from "@/data/leksindeseis";
import { GAME_REGISTRY }               from "@/config/games";
import { todayISO }                    from "@/lib/puzzleDate";

export const dynamic = "force-dynamic";

const CONNECTIONS_RULES = [
  "Οι 16 λέξεις χωρίζονται σε **4 κατηγορίες των 4 λέξεων**.",
  "Επίλεξε 4 λέξεις που νομίζεις ότι ανήκουν μαζί και πάτησε **Υποβολή**.",
  "Οι κατηγορίες έχουν διαβαθμίσεις: κίτρινο = εύκολη, πράσινο, μπλε, **μοβ = δύσκολη**.",
  "Έχεις **4 λάθη** πριν τελειώσει το παιχνίδι.",
  "Αν είσαι **μία παραπάνω**, σου δίνουμε υπονόμευμα!",
  "Νέο παζλ κάθε μέρα!",
];

export default async function LeksindeseisPage() {
  const today = todayISO();
  const { puzzle, submitter_name } = await getTodaysLeksindeseisPuzzle(today);

  return (
    <GamePageShell gameId="leksindeseis">
      <GameHeader title="🔗 Leksindeseis" className="mb-1">
        <HowToPlayModal
          title="Πώς να παίξεις — Leksindeseis"
          items={CONNECTIONS_RULES}
          bulletIcon={GAME_REGISTRY.leksindeseis.emoji}
        />
      </GameHeader>
      <p className="text-muted text-xs mb-1 self-start max-w-game">
        Ομαδοποίησε 16 λέξεις σε 4 κατηγορίες των 4
      </p>
      {submitter_name && (
        <p className="text-xs text-muted self-start max-w-game mb-5">
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
    </GamePageShell>
  );
}
