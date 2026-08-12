// /privacy — the Platform's only legal surface (TICKET-07).
//
// Written in Greek, in the same plain voice as the games, because the audience is
// Greek players and not regulators. Deliberately unadvertised: reachable only
// from the drawer's Βοήθεια section, with no banner, no consent dialog and no
// home-page link. That posture is only defensible because the Platform runs no
// analytics and sets no advertising cookie — if that ever changes, this page and
// its discoverability both have to be revisited (ADR 0022 sibling; TICKET-08
// records the decision that keeps it true).
//
// EVERY CLAIM HERE IS LOAD-BEARING. It is a public statement about what the code
// does, so it must be re-read whenever storage, hosting or third parties change:
//   · FeedbackModal.tsx  — the only third-party call, and the only two fields sent
//   · retention.ts       — the pruning window, imported below rather than retyped
//   · platform.ts        — the controller's name and address
// A server component on purpose: static text, no client state, no hydration.

import type { Metadata } from "next";
import { CONTACT_EMAIL, CONTROLLER_NAME, PLATFORM_NAME } from "@/config/platform";
import { GAME_REGISTRY } from "@/config/games";
import { SESSION_RETENTION_DAYS } from "@/config/retention";
import { cardShell } from "@/styles/recipes";

export const metadata: Metadata = {
  title: `Απόρρητο — ${PLATFORM_NAME}`,
  description: `Τι δεδομένα κρατάει το ${PLATFORM_NAME} και πώς τα σβήνεις.`,
};

/** Changed by hand when the page's substance changes — not on a typo fix. */
const LAST_UPDATED = "12 Αυγούστου 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${cardShell} px-4 py-3.5`}>
      <h2 className="text-sm font-semibold text-foreground mb-2">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="w-full max-w-game mx-auto px-4 py-6 space-y-4">
      <header className="px-1">
        <h1 className="text-lg font-semibold text-foreground">Απόρρητο</h1>
        <p className="text-xs text-muted mt-1">Τελευταία ενημέρωση: {LAST_UPDATED}</p>
      </header>

      <p className="px-1 text-sm leading-relaxed text-foreground">
        Με λίγα λόγια: παίζεις χωρίς λογαριασμό, δεν σου ζητάμε το όνομά σου, δεν υπάρχουν
        διαφημίσεις ούτε εργαλεία παρακολούθησης, και δεν πουλάμε τίποτα σε κανέναν. Παρακάτω τα
        αναλυτικά.
      </p>

      <Section title="Ποιος είναι υπεύθυνος">
        <p>
          Το {PLATFORM_NAME} το φτιάχνει και το συντηρεί ο {CONTROLLER_NAME}. Για οτιδήποτε αφορά τα
          δεδομένα σου, γράψε στο <span className="text-foreground font-medium">{CONTACT_EMAIL}</span>.
        </p>
      </Section>

      <Section title="Τι κρατάμε αν δεν συνδεθείς">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Ένα <strong className="text-foreground font-medium">τυχαίο αναγνωριστικό συσκευής</strong> —
            ένας αριθμός που φτιάχνεται στον browser σου την πρώτη φορά που παίζεις. Δεν προκύπτει από
            εσένα και δεν οδηγεί πουθενά αλλού· είναι απλώς το κλειδί με το οποίο ξαναβρίσκεις την
            πρόοδό σου.
          </li>
          <li>Την πρόοδό σου στα παιχνίδια και τα σκορ σου.</li>
          <li>Ένα όνομα εμφάνισης, αν διαλέξεις να βάλεις — είναι προαιρετικό.</li>
        </ul>
        <p>
          Δεν ζητάμε και δεν αποθηκεύουμε πραγματικό όνομα, email, ηλικία ή τοποθεσία. Κράτα υπόψη ότι
          το αναγνωριστικό ζει στον browser σου: αν καθαρίσεις τα δεδομένα του, χάνεται και μαζί του η
          πρόσβαση στην πρόοδό σου.
        </p>
      </Section>

      <Section title="Τι αλλάζει αν συνδεθείς με Google">
        <p>
          Φτάνει σε εμάς η <strong className="text-foreground font-medium">διεύθυνση email σου</strong>,
          την οποία κρατάει το Supabase. Χρησιμεύει σε ένα μόνο πράγμα: να ξαναβρίσκεις το ιστορικό σου
          όταν αλλάζεις συσκευή. Δεν στέλνουμε ενημερωτικά email και δεν τη δίνουμε πουθενά.
        </p>
      </Section>

      <Section title="Τι βλέπουν οι άλλοι παίκτες">
        <p>
          Το όνομα εμφάνισης που έχεις διαλέξει φαίνεται στους πίνακες κατάταξης, και οι λέξεις που
          προτείνεις στο {GAME_REGISTRY.leksikastirio.title} εμφανίζονται δημόσια για να τις ψηφίσουν
          οι υπόλοιποι. Τίποτα άλλο δεν είναι ορατό — ούτε το email σου ούτε το αναγνωριστικό της
          συσκευής σου.
        </p>
      </Section>

      <Section title="Πού βρίσκονται τα δεδομένα">
        <p>
          Στο Supabase (Φρανκφούρτη, <code className="font-mono text-xs">eu-central-1</code>) και στο
          Vercel (<code className="font-mono text-xs">fra1</code>). Και τα δύο εντός Ευρωπαϊκής Ένωσης.
        </p>
      </Section>

      <Section title="Ποιος άλλος τα βλέπει">
        <p>
          Κανείς, με μία εξαίρεση: όταν <em>εσύ</em> στέλνεις σχόλιο από τα «Σχόλια / Πρόβλημα», το
          μήνυμα φεύγει μέσω της υπηρεσίας FormSubmit για να φτάσει στο email μας. Ταξιδεύουν δύο
          πράγματα, το κείμενό σου και το αναγνωριστικό της συσκευής σου, και τίποτα άλλο.
        </p>
        <p>
          Δεν υπάρχουν διαφημίσεις, δεν υπάρχουν εργαλεία στατιστικών ή παρακολούθησης, δεν
          χρησιμοποιούμε cookies παρακολούθησης και δεν πουλάμε δεδομένα σε κανέναν.
        </p>
      </Section>

      <Section title="Πόσο καιρό τα κρατάμε">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-foreground font-medium">Τα σκορ:</strong> όσο υπάρχουν τα
            παιχνίδια. Τα συνολικά σου στατιστικά και τα σερί υπολογίζονται από ολόκληρο το ιστορικό,
            οπότε αν σβήναμε παλιά σκορ θα χαλούσαν.
          </li>
          <li>
            <strong className="text-foreground font-medium">Τα προσωρινά δεδομένα παρτίδας:</strong>{" "}
            {SESSION_RETENTION_DAYS} ημέρες, και μετά διαγράφονται αυτόματα.
          </li>
        </ul>
      </Section>

      <Section title="Πώς τα σβήνεις">
        <p>
          Στείλε μας μήνυμα από τα «Σχόλια / Πρόβλημα» στο μενού, ή γράψε στο{" "}
          <span className="text-foreground font-medium">{CONTACT_EMAIL}</span>. Τα σβήνουμε όλα με το
          χέρι — δεν υπάρχει κουμπί, και προτιμούμε να το πούμε καθαρά παρά να υπονοήσουμε κάτι που δεν
          υπάρχει. Υπολόγισε έως έναν μήνα.
        </p>
        <p>
          Αν στείλεις το αίτημα από τη φόρμα σχολίων, το αναγνωριστικό της συσκευής σου έρχεται μαζί
          του, οπότε δεν χρειάζεται να ψάξεις ή να μας στείλεις τίποτα άλλο.
        </p>
      </Section>

      <Section title="Τα δικαιώματά σου">
        <p>
          Μπορείς να ζητήσεις να δεις, να διορθώσεις ή να σβήσεις ό,τι κρατάμε για σένα, στην ίδια
          διεύθυνση. Αν δεν μείνεις ικανοποιημένος με την απάντησή μας, έχεις δικαίωμα να
          προσφύγεις στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα.
        </p>
      </Section>
    </div>
  );
}
