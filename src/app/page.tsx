// app/page.tsx — game picker home page.
// Each card links to the game AND surfaces a HowToPlayModal so players can
// learn the rules without navigating away.
// The ? button is a sibling of <Link>, not nested inside it, so there is no
// invalid button-inside-anchor nesting.
//
// Note: rule strings are also defined in each game’s own page.tsx.
// Extract to src/data/gameRules.ts when a third consumer appears.

import { HowToPlayModal } from "@/components/shared/HowToPlayModal";
import Link from "next/link";

interface GameEntry {
  id:          string;
  emoji:       string;
  title:       string;
  description: string;
  href:        string;
  /** Shows a 🚧 badge but the card is still fully clickable */
  wip:         boolean;
  rulesTitle:  string;
  bulletIcon:  string;
  rules:       string[];
}

const GAMES: GameEntry[] = [
  {
    id:          "spelling-bee",
    emoji:       "🍯",
    title:       "Spelling Bee",
    description: "Βρες λέξεις με τα 7 γράμματα της κηρήθρας.",
    href:        "/spelling-bee",
    wip:         false,
    rulesTitle:  "Πώς να παίξεις — Spelling Bee",
    bulletIcon:  "🐝",
    rules: [
      "Βρες όσες λέξεις μπορείς χρησιμοποιώντας τα 7 γράμματα.",
      "Κάθε λέξη πρέπει να περιέχει το **κεντρικό γράμμα**.",
      "Οι λέξεις πρέπει να έχουν τουλάχιστον **4 γράμματα**.",
      "Τα γράμματα μπορούν να χρησιμοποιηθούν **περισσότερες από μία φορά**.",
      "Μια λέξη που χρησιμοποιεί **και τα 7 γράμματα** κερδίζει επιπλέον bonus πόντους!",
      "Ανέβα στην κατάταξη από Αρχάριος μέχρι Βασίλισσα! 👑",
    ],
  },
  {
    id:          "wordle",
    emoji:       "🟩",
    title:       "Wordle GR",
    description: "Μάντεψε τη λέξη σε 6 προσπάθειες — 5 γράμματα.",
    href:        "/wordle",
    wip:         false,
    rulesTitle:  "Πώς να παίξεις — Wordle GR",
    bulletIcon:  "▸",
    rules: [
      "Μάντεψε τη λέξη της ημέρας σε **6 προσπάθειες**.",
      "Κάθε προσπάθεια πρέπει να είναι έγκυρη 5γράμματη ελληνική λέξη.",
      "🟩 **Πράσινο** = σωστό γράμμα στη σωστή θέση.",
      "🟨 **Κίτρινο** = σωστό γράμμα, λάθος θέση.",
      "⬛ **Γκρι** = το γράμμα δεν υπάρχει στη λέξη.",
      "Νέα λέξη κάθε μέρα!",
    ],
  },
  {
    id:          "connections",
    emoji:       "🔗",
    title:       "Connections",
    description: "Ομαδοποίησε 16 λέξεις σε 4 κατηγορίες των 4.",
    href:        "/connections",
    wip:         true,
    rulesTitle:  "Πώς να παίξεις — Connections",
    bulletIcon:  "🔗",
    rules: [
      "Οι 16 λέξεις χωρίζονται σε **4 κατηγορίες των 4 λέξεων**.",
      "Επίλεξε 4 λέξεις που νομίζεις ότι ανήκουν μαζί και πάτησε **Υποβολή**.",
      "Οι κατηγορίες έχουν διαβαθμίσεις: κίτρινο = εύκολη, πράσινο, μπλε, **μοβ = δύσκολη**.",
      "Έχεις **4 λάθη** πριν τελειώσει το παιχνίδι.",
      "Νέο παζλ κάθε μέρα!",
    ],
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-zinc-50 px-4 py-12">
      <h1 className="text-3xl font-bold text-stone-800 mb-2">Παιχνίδια Λέξεων</h1>
      <p className="text-stone-500 text-sm mb-10">Επίλεξε παιχνίδι για να ξεκινήσεις</p>

      <ul className="w-full max-w-sm space-y-4">
        {GAMES.map((game) => (
          // Each list item is the card container with the border/shadow styling.
          // The Link covers the main content area; HowToPlayModal sits as a
          // sibling in a right-hand column — no button nested inside an <a>.
          <li
            key={game.id}
            className="flex items-stretch rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300 transition-all overflow-hidden"
          >
            <Link
              href={game.href}
              className="flex-1 flex items-start gap-4 p-5"
            >
              <span className="text-3xl mt-0.5">{game.emoji}</span>
              <div>
                <p className="font-semibold text-stone-800 flex items-center gap-2 flex-wrap">
                  {game.title}
                  {game.wip && (
                    <span className="text-xs font-normal text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      🚧 Υπό κατασκευή
                    </span>
                  )}
                </p>
                <p className="text-sm text-stone-500 mt-0.5">{game.description}</p>
              </div>
            </Link>

            {/* Help button — sibling of Link so it is never nested inside <a> */}
            <div className="flex items-center px-3 border-l border-stone-100 shrink-0">
              <HowToPlayModal
                title={game.rulesTitle}
                items={game.rules}
                bulletIcon={game.bulletIcon}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
