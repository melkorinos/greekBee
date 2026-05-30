// app/page.tsx — game picker home page.
// Each card links to the game AND surfaces a HowToPlayModal so players can
// learn the rules without navigating away.
// The ? button is a sibling of <Link>, not nested inside it, so there is no
// invalid button-inside-anchor nesting.
//
// Note: rule strings are also defined in each game’s own page.tsx.
// Extract to src/data/gameRules.ts when a third consumer appears.

import React from "react";
import { GAME_REGISTRY } from "@/config/games";
import { HowToPlayModal } from "@/components/shared/HowToPlayModal";
import { HomeTrophyButton } from "@/components/shared/HomeTrophyButton";
import { SubmitPuzzleButton } from "@/components/shared/SubmitPuzzleButton";
import Link from "next/link";

function StavroleksoMakerButton() {
  return (
    <Link
      href="/stavrolekso/maker"
      aria-label="Δημιούργησε σταυρόλεξο"
      title="Δημιούργησε σταυρόλεξο"
      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-base leading-none"
    >
      ✏️
    </Link>
  );
}

// Picker-specific content (HowToPlay copy) — not platform metadata, stays here.
// Extract to src/data/gameRules.ts when a third consumer appears.
const GAME_RULES = {
  leksokipos: {
    rulesTitle: "Πώς να παίξεις — Leksokipos",
    bulletIcon: "🌸",
    rules: [
      "Βρες όσες λέξεις μπορείς χρησιμοποιώντας τα 7 γράμματα.",
      "Κάθε λέξη πρέπει να περιέχει το **κεντρικό γράμμα**.",
      "Οι λέξεις πρέπει να έχουν τουλάχιστον **4 γράμματα**.",
      "Τα γράμματα μπορούν να χρησιμοποιηθούν **περισσότερες από μία φορά**.",
      "Μια λέξη που χρησιμοποιεί **και τα 7 γράμματα** κερδίζει επιπλέον bonus πόντους!",
      "Ανέβα στην κατάταξη από Σπόρο μέχρι Άνθος! 🌸",
    ],
  },
  leksiarxeio: {
    rulesTitle: "Πώς να παίξεις — Leksiarxeio",
    bulletIcon: "▸",
    rules: [
      "Μάντεψε τη λέξη της ημέρας σε **6 προσπάθειες**.",
      "Κάθε προσπάθεια πρέπει να είναι έγκυρη 5γράμματη ελληνική λέξη.",
      "🟩 **Πράσινο** = σωστό γράμμα στη σωστή θέση.",
      "🟨 **Κίτρινο** = σωστό γράμμα, λάθος θέση.",
      "⬛ **Γκρι** = το γράμμα δεν υπάρχει στη λέξη.",
      "Νέα λέξη κάθε μέρα!",
    ],
  },
  leksindeseis: {
    rulesTitle: "Πώς να παίξεις — Leksindeseis",
    bulletIcon: "🔗",
    rules: [
      "Οι 16 λέξεις χωρίζονται σε **4 κατηγορίες των 4 λέξεων**.",
      "Επίλεξε 4 λέξεις που νομίζεις ότι ανήκουν μαζί και πάτησε **Υποβολή**.",
      "Οι κατηγορίες έχουν διαβαθμίσεις: κίτρινο = εύκολη, πράσινο, μπλε, **μοβ = δύσκολη**.",
      "Έχεις **4 λάθη** πριν τελειώσει το παιχνίδι.",
      "Νέο παζλ κάθε μέρα!",
    ],
  },
  vrestifrasi: {
    rulesTitle: "Πώς να παίξεις — Vres Tin Frasi",
    bulletIcon: "💬",
    rules: [
      "Μάντεψε τη φράση της ημέρας σε **6 προσπάθειες**.",
      "Η φράση έχει 2–4 λέξεις. Γράψε κάθε λέξη ξεχωριστά.",
      "🟩 **Πράσινο** = σωστό γράμμα, σωστή θέση.",
      "🟨 **Κίτρινο** = σωστό γράμμα, λάθος θέση (ίδια λέξη).",
      "🟪 **Μοβ** = το γράμμα ανήκει σε **άλλη λέξη** της φράσης.",
      "⬛ **Γκρι** = το γράμμα δεν υπάρχει πουθενά στη φράση.",
    ],
  },
  stavrolekso: {
    rulesTitle: "Πώς να παίξεις — Stavrolekso",
    bulletIcon: "♟️",
    rules: [
      "Επίλεξε ένα παζλ από τη λίστα εγκεκριμένων σταυρόλεξων.",
      "Πάτησε ένα κελί για να επιλέξεις **Slot** (Οριζόντια ή Κάθετα).",
      "Πληκτρολόγησε τη λέξη — το slot **πρασινίζει** αν απαντήσεις σωστά!",
      "Μπορείς και να **δημιουργήσεις** το δικό σου σταυρόλεξο για υποβολή.",
    ],
  },
  leksikastirio: {
    rulesTitle: "Πώς λειτουργεί — Λεξικαστήριο",
    bulletIcon: "⚖️",
    rules: [
      "Πρότεινε λέξεις που **λείπουν** από τη λίστα ή που **δεν πρέπει** να είναι εκεί.",
      "Ψήφισε τις προτάσεις άλλων παικτών.",
      "Οι εγκεκριμένες λέξεις **προστίθενται** ή **αφαιρούνται** από τη λίστα.",
      "Μπορείς να αναφέρεις λέξεις και μέσα από το παιχνίδι Leksokipos!",
    ],
  },
} as const satisfies Record<keyof typeof GAME_REGISTRY, { rulesTitle: string; bulletIcon: string; rules: readonly string[] }>;

const GAMES = (Object.keys(GAME_REGISTRY) as Array<keyof typeof GAME_REGISTRY>).map(
  (id) => ({ id, ...GAME_REGISTRY[id], ...GAME_RULES[id] }),
);

const gameList      = GAMES.filter((g) => g.id !== "leksikastirio");
const communityList = GAMES.filter((g) => g.id === "leksikastirio");

function GameCard({ game, submitButton }: { game: (typeof GAMES)[number]; submitButton?: React.ReactNode }) {
  return (
    <li className="flex items-stretch rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md hover:border-stone-300 dark:hover:border-stone-700 transition-all overflow-hidden">
      <Link href={game.href} className="flex-1 flex items-start gap-4 p-5">
        <span className="text-3xl mt-0.5">{game.emoji}</span>
        <div>
          <p className="font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2 flex-wrap">
            {game.title}
            {game.wip && (
              <span className="text-xs font-normal text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                🚧 Υπό κατασκευή
              </span>
            )}
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{game.description}</p>
        </div>
      </Link>
      <div className="flex flex-col items-center justify-center gap-1 px-3 border-l border-stone-100 dark:border-stone-800 shrink-0">
        <HowToPlayModal
          title={game.rulesTitle}
          items={game.rules}
          bulletIcon={game.bulletIcon}
        />
        {submitButton}
      </div>
    </li>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-zinc-50 dark:bg-stone-950 px-4 py-12">
      <h1 className="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-2">Leksarxeia</h1>
      <p className="text-stone-500 dark:text-stone-400 text-sm mb-10">Επίλεξε παιχνίδι για να ξεκινήσεις</p>

      <ul className="w-full max-w-sm space-y-4">
        {gameList.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            submitButton={
              (game.id === "leksiarxeio" || game.id === "leksindeseis" || game.id === "vrestifrasi")
                ? <><SubmitPuzzleButton game={game.id} /><HomeTrophyButton gameId={game.id} /></>
                : game.id === "stavrolekso"
                  ? <StavroleksoMakerButton />
                  : game.id === "leksokipos"
                    ? <HomeTrophyButton gameId={game.id} />
                    : undefined
            }
          />
        ))}
      </ul>

      <div className="w-full max-w-sm mt-8 mb-4 flex items-center gap-3">
        <hr className="flex-1 border-stone-200 dark:border-stone-800" />
        <span className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest">Κοινότητα</span>
        <hr className="flex-1 border-stone-200 dark:border-stone-800" />
      </div>

      <ul className="w-full max-w-sm space-y-4">
        {communityList.map((game) => <GameCard key={game.id} game={game} />)}
      </ul>
    </div>
  );
}
