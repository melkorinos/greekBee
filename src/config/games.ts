/**
 * Central Game Registry — single source of truth for every Game on the Platform.
 * Add a new Game here; Shell nav and picker card update automatically.
 * Picker-specific content (rules, HowToPlay copy) stays in app/page.tsx.
 */
export const GAME_REGISTRY = {
  leksokipos: {
    label:       "🌸 Leksokipos",
    emoji:       "🌸",
    title:       "Leksokipos",
    description: "Βρες λέξεις με τα 7 γράμματα του κήπου.",
    href:        "/leksokipos",
    wip:         false,
  },
  leksiarxeio: {
    label:       "✏️ Leksiarxeio",
    emoji:       "✏️",
    title:       "Leksiarxeio",
    description: "Μάντεψε τη λέξη σε 6 προσπάθειες — 5 γράμματα.",
    href:        "/leksiarxeio",
    wip:         false,
  },
  leksindeseis: {
    label:       "🔗 Leksindeseis",
    emoji:       "🔗",
    title:       "Leksindeseis",
    description: "Ομαδοποίησε 16 λέξεις σε 4 κατηγορίες των 4.",
    href:        "/leksindeseis",
    wip:         true,
  },
  vrestifrasi: {
    label:       "💬 Vres Tin Frasi",
    emoji:       "💬",
    title:       "Vres Tin Frasi",
    description: "Βρες τη φράση της ημέρας σε 6 προσπάθειες.",
    href:        "/vres-tin-frasi",
    wip:         false,
  },
  stavrolekso: {
    label:       "♟️ Stavrolekso",
    emoji:       "♟️",
    title:       "Stavrolekso",
    description: "Λύσε και δημιούργησε σταυρόλεξα της κοινότητας.",
    href:        "/stavrolekso",
    wip:         false,
  },
  leksodromia: {
    label:       "🏁 Λεξοδρομία",
    emoji:       "🏁",
    title:       "Λεξοδρομία",
    description: "Ξεμπέρδεψε 10 λέξεις — όσο πιο γρήγορα, τόσο περισσότεροι πόντοι.",
    href:        "/leksodromia",
    wip:         false,
  },
  leksoplegma: {
    label:       "🕸️ Λεξόπλεγμα",
    emoji:       "🕸️",
    title:       "Λεξόπλεγμα",
    description: "Βρες τις κρυμμένες λέξεις πάνω στις γραμμές του πλέγματος.",
    href:        "/leksoplegma",
    wip:         false,
  },
  leksikastirio: {
    label:       "⚖️ Leksikastirio",
    emoji:       "⚖️",
    title:       "Leksikastirio",
    description: "Ψηφίστε λέξεις για προσθήκη ή αφαίρεση από τη λίστα.",
    href:        "/leksikastirio",
    wip:         false,
  },
} as const;

/** The ID of any registered Game. */
export type RegistryGameId = keyof typeof GAME_REGISTRY;
