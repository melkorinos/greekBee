// app/page.tsx — game picker home page.
// Each card links to the game AND surfaces a HowToPlayModal so players can
// learn the rules without navigating away.
// The ? button is a sibling of <Link>, not nested inside it, so there is no
// invalid button-inside-anchor nesting.
//
// Note: rule strings are also defined in each game’s own page.tsx.
// Extract to src/data/gameRules.ts when a third consumer appears.

import React from "react";
import { GAME_REGISTRY, gameIdsWith, type GameIdWith, type RegistryGameId } from "@/config/games";
import { PLATFORM_NAME } from "@/config/platform";
import { HowToPlayModal } from "@/components/shared/HowToPlayModal";
import { HomeTrophyButton } from "@/components/shared/HomeTrophyButton";
import { SubmitPuzzleButton } from "@/components/shared/SubmitPuzzleButton";
import { btnHeaderIcon, btnHeaderIconSize, cardShellInteractive } from "@/styles/recipes";
import Link from "next/link";

function StavroleksoMakerButton() {
  return (
    <Link
      href="/stavrolekso/maker"
      aria-label="Δημιούργησε σταυρόλεξο"
      title="Δημιούργησε σταυρόλεξο"
      className={`${btnHeaderIconSize} ${btnHeaderIcon} text-base`}
    >
      ✏️
    </Link>
  );
}

// Picker-specific content (HowToPlay copy) — not platform metadata, stays here.
// Extract to src/data/gameRules.ts when a third consumer appears.
//
// No bulletIcon field: the rule bullet IS the Game's registry emoji, derived in
// GameCard. Hand-typing it here is how Leksiarxeio ended up bulleting its rules
// with a generic ▸ while every other Game showed its own icon.
const GAME_RULES = {
  leksokipos: {
    rulesTitle: "Πώς να παίξεις — Leksokipos",
    rules: [
      "Βρες όσες λέξεις μπορείς χρησιμοποιώντας τα 7 γράμματα.",
      "Κάθε λέξη πρέπει να περιέχει το **κεντρικό γράμμα**.",
      "Οι λέξεις πρέπει να έχουν τουλάχιστον **4 γράμματα**.",
      "Τα γράμματα μπορούν να χρησιμοποιηθούν **περισσότερες από μία φορά**.",
      "Μια λέξη που χρησιμοποιεί **και τα 7 γράμματα** κερδίζει επιπλέον bonus πόντους!",
    ],
  },
  leksiarxeio: {
    rulesTitle: "Πώς να παίξεις — Leksiarxeio",
    rules: [
      "Μάντεψε τη λέξη της ημέρας σε **6 προσπάθειες**.",
      "Χρησιμοποίησε τα **- / +** για να αλλάξεις μήκος λέξης (**4–8 γράμματα**).",
      "Κάθε προσπάθεια πρέπει να είναι έγκυρη ελληνική λέξη του επιλεγμένου μήκους.",
      "🟩 **Πράσινο** = σωστό γράμμα στη σωστή θέση.",
      "🟨 **Κίτρινο** = σωστό γράμμα, λάθος θέση.",
      "⬛ **Γκρι** = το γράμμα δεν υπάρχει στη λέξη.",
      "Νέα λέξη κάθε μέρα για κάθε μήκος!",
    ],
  },
  leksindeseis: {
    rulesTitle: "Πώς να παίξεις — Leksindeseis",
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
    rules: [
      "Επίλεξε ένα παζλ από τη λίστα εγκεκριμένων σταυρόλεξων.",
      "Πάτησε ένα κελί για να επιλέξεις **Slot** (Οριζόντια ή Κάθετα).",
      "Πληκτρολόγησε τη λέξη — το slot **πρασινίζει** αν απαντήσεις σωστά!",
      "Μπορείς και να **δημιουργήσεις** το δικό σου σταυρόλεξο για υποβολή.",
    ],
  },
  leksodromia: {
    rulesTitle: "Πώς να παίξεις — Leksodromia",
    rules: [
      "Ξεμπέρδεψε **10 ανακατεμένες λέξεις** — 2 από κάθε μήκος, 4 έως 8 γράμματα.",
      "Δεν υπάρχει χρονόμετρο αποτυχίας: όσο πιο **γρήγορα** λύσεις, τόσο περισσότερους πόντους παίρνεις.",
      "Κάθε **υπόδειξη** αποκαλύπτει ένα γράμμα αλλά κοστίζει πόντους.",
      "Αν κολλήσεις, πάτα **Επόμενο** — η λέξη επιστρέφει στο **τέλος του γύρου** για δεύτερη ευκαιρία (το ρολόι της συνεχίζει).",
      "Ίδιο παζλ για όλους κάθε μέρα — μπες στον πίνακα σκορ!",
    ],
  },
  leksoplegma: {
    rulesTitle: "Πώς να παίξεις — Leksoplegma",
    rules: [
      "Βρες τις **9 κρυμμένες λέξεις** σύροντας πάνω στα γράμματα — μόνο κατά μήκος των γραμμών.",
      "Μπορείς να σχηματίζεις κάθε λέξη **προς όποια κατεύθυνση** θες.",
      "Όταν βρίσκεις μια λέξη, τα γράμματα που δεν χρειάζονται πια **θαμπώνουν** — αλλά παίζουν ως το τέλος.",
      "Κάθε κρυμμένη λέξη δίνει **10 πόντους ανά γράμμα**.",
      "Κάθε άλλη υπαρκτή λέξη πάνω στις γραμμές δίνει **+25 πόντους** — πάτα ✓ για να την υποβάλεις.",
    ],
  },
  leksikastirio: {
    rulesTitle: "Πώς λειτουργεί — Λεξικαστήριο",
    rules: [
      "Πρότεινε λέξεις που **λείπουν** από τη λίστα ή που **δεν πρέπει** να είναι εκεί.",
      "Ψήφισε τις προτάσεις άλλων παικτών.",
      "Οι εγκεκριμένες λέξεις **προστίθενται** ή **αφαιρούνται** από τη λίστα.",
      "Μπορείς να αναφέρεις λέξεις και μέσα από το παιχνίδι Leksokipos!",
    ],
  },
  // Published (session 121) after the operator play-through; the gameplay copy
  // below is final.
  topothesies: {
    rulesTitle: "Πώς να παίξεις — Topothesies",
    rules: [
      "Δες τη **σιλουέτα** μιας περιφερειακής ενότητας και μάντεψέ την σε **4 προσπάθειες**.",
      "Μετά από κάθε λάθος παίρνεις **απόσταση, κατεύθυνση** και ποσοστό **εγγύτητας**.",
      "Αν τη βρεις, μάντεψε και την **πρωτεύουσά** της σε **3 προσπάθειες** για bonus.",
    ],
  },
  posokanei: {
    rulesTitle: "Πώς να παίξεις — Πόσο κάνει;",
    rules: [
      "Δες ένα **προϊόν** του σούπερ μάρκετ και μάντεψε την **τιμή** του σε **6 προσπάθειες**.",
      "Μετά από κάθε λάθος μαθαίνεις αν η σωστή τιμή είναι **πιο πάνω** ή **πιο κάτω**, με ποσοστό **εγγύτητας**.",
      "Κερδίζεις αν πέσεις **αρκετά κοντά** — όσο νωρίτερα, τόσο περισσότεροι πόντοι!",
    ],
  },
  logopaignio: {
    rulesTitle: "Πώς να παίξεις — Λογοπαίγνιο",
    rules: [
      "Δες το **λογότυπο** μιας ελληνικής εταιρείας — χωρίς το όνομά της — και γράψε το όνομα.",
      "Το λογότυπο ξεκινά **θολό** και ξεθολώνει λίγο σε κάθε λάθος προσπάθεια.",
      "Ο **τομέας** της εταιρείας φαίνεται σαν βοήθεια — όσο πιο νωρίς τη βρεις, τόσο περισσότεροι πόντοι!",
    ],
  },
} as const satisfies Record<keyof typeof GAME_REGISTRY, { rulesTitle: string; rules: readonly string[] }>;

const GAMES = (Object.keys(GAME_REGISTRY) as Array<keyof typeof GAME_REGISTRY>).map(
  (id) => ({ id, ...GAME_REGISTRY[id], ...GAME_RULES[id] }),
);

// `hidden` Games are on no list at all — not the main one, not a section of their
// own (ADR 0022). Their routes stay live, so a held link still plays; the picker
// simply stops advertising them. There is no «Υπό κατασκευή» section any more: an
// unfinished Game is hidden rather than signposted, which is also why the card
// below no longer carries a 🚧 chip.
// Community (leksikastirio) keeps its own section.
const visible       = GAMES.filter((g) => !g.hidden);
const gameList      = visible.filter((g) => g.id !== "leksikastirio");
const communityList = visible.filter((g) => g.id === "leksikastirio");

// Read from the registry rather than from GameLeaderboardModal's runtime export:
// this is a Server Component, and a value imported from a "use client" module
// arrives as a client-reference proxy, not the array (it builds, then fails at
// prerender). Types from there are fine — they are erased.
const LEADERBOARD_IDS: readonly RegistryGameId[] = gameIdsWith("leaderboard");

/** Narrows to the Games whose registry row declares the `leaderboard` capability. */
function hasLeaderboard(id: RegistryGameId): id is GameIdWith<"leaderboard"> {
  return LEADERBOARD_IDS.includes(id);
}

// Per-game action buttons shown on the right edge of a card. Shared between the
// main list and the under-construction list so a game keeps its buttons wherever
// it lives.
//
// The 🏆 button is DERIVED from the `leaderboard` capability, not hand-typed:
// this list is how the two placeholder-content games came to advertise a board on
// the picker. The community-puzzle button stays explicit — "accepts player
// submissions" is a genuine per-game fact with no capability behind it yet.
function submitButtonFor(id: RegistryGameId): React.ReactNode {
  if (id === "stavrolekso") return <StavroleksoMakerButton />;

  const trophy = hasLeaderboard(id) ? <HomeTrophyButton gameId={id} /> : undefined;

  if (id === "leksindeseis") {
    return <><SubmitPuzzleButton game={id} />{trophy}</>;
  }
  return trophy;
}

function GameCard({ game, submitButton }: { game: (typeof GAMES)[number]; submitButton?: React.ReactNode }) {
  return (
    <li className={`flex items-stretch ${cardShellInteractive} overflow-hidden`}>
      <Link href={game.href} className="flex-1 flex items-start gap-4 p-5">
        <span className="text-3xl mt-0.5">{game.emoji}</span>
        <div>
          <p className="font-semibold text-foreground">
            {game.title}
          </p>
          {/* Clamped to two lines so no description can push its card taller
              than the others; the list's auto-rows-fr then levels the shorter
              ones up to match. Two lines is the cap, not the height. */}
          <p className="text-sm text-muted mt-0.5 line-clamp-2">{game.description}</p>
        </div>
      </Link>
      <div className="flex flex-col items-center justify-center gap-1 px-3 border-l border-border shrink-0">
        <HowToPlayModal
          title={game.rulesTitle}
          items={game.rules}
          bulletIcon={game.emoji}
        />
        {submitButton}
      </div>
    </li>
  );
}

export default function HomePage() {
  return (
    <div className="relative flex flex-col items-center justify-start min-h-screen bg-background px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-2">{PLATFORM_NAME}</h1>
      <p className="text-muted text-sm mb-10">Επίλεξε παιχνίδι για να ξεκινήσεις</p>

      {/* grid + auto-rows-fr, not space-y: every row takes the height of the
          tallest, so all the cards match instead of each sizing to its own
          description. gap-4 replaces the space-y-4 it displaces. */}
      <ul className="w-full max-w-picker grid gap-4 auto-rows-fr">
        {gameList.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            submitButton={submitButtonFor(game.id)}
          />
        ))}
      </ul>

      <div className="w-full max-w-picker mt-8 mb-4 flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-xs font-semibold text-muted uppercase tracking-widest">Κοινότητα</span>
        <hr className="flex-1 border-border" />
      </div>

      <ul className="w-full max-w-picker grid gap-4 auto-rows-fr">
        {communityList.map((game) => <GameCard key={game.id} game={game} />)}
      </ul>

    </div>
  );
}
