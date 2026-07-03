// achievements — the Leksokipos trophy catalog (pure data, zero React imports).
//
// v1 ships the DISPLAY catalog only: every entry renders locked/greyed in the
// Trophy Case. Detection, the player_achievements table, and earned wiring belong
// to the achievements epic (achievementsLeksokipos.md).
//
// Frozen ids: each `id` (and each tier `id`) becomes player_achievements.achievement_id
// and FREEZES on first deploy. Renaming/removing an id is forbidden after ship;
// adding new tiers later is non-breaking.

export type AchievementKind = "oneshot" | "tiered";

export type TierName = "chalkino" | "asimenio" | "chryso";

export interface AchievementTier {
  /** Frozen award id — the player_achievements.achievement_id for this tier. */
  id:        string;
  tier:      TierName;
  threshold: number;
  /** Greek tier word shown on the badge. */
  label:     string;
}

export interface Achievement {
  id:     string;
  name:   string;
  hint:   string;
  kind:   AchievementKind;
  tiers?: AchievementTier[];
}

/**
 * Detection signature the achievements epic will implement — declared here so the
 * catalog's contract is visible, but intentionally unimplemented in this slice.
 */
export type AchievementPredicate = (earned: unknown) => boolean;

export const LEKSOKIPOS_ACHIEVEMENTS: readonly Achievement[] = [
  {
    id:   "leksokipos-first-daily",
    name: "Πρώτα Βήματα",
    hint: "Παίξε το πρώτο σου ημερήσιο παζλ.",
    kind: "oneshot",
  },
  {
    id:   "leksokipos-stin-korifi",
    name: "Στην Κορυφή",
    hint: "Φτάσε στην κατάταξη Απολυτότητα σε ένα ημερήσιο παζλ.",
    kind: "oneshot",
  },
  {
    id:   "leksokipos-tzimani",
    name: "Τζιμάνι",
    hint: "Βρες όλες τις λέξεις ενός ημερήσιου παζλ.",
    kind: "oneshot",
  },
  {
    id:   "leksokipos-sidirodromos",
    name: "Σιδηρόδρομος",
    hint: "Βρες μια λέξη με 10+ γράμματα.",
    kind: "oneshot",
  },
  {
    id:   "leksokipos-theristis",
    name: "Θεριστής",
    hint: "Βρες το 80% των λέξεων ενός ημερήσιου παζλ.",
    kind: "oneshot",
  },
  {
    id:   "leksokipos-kynigos-pangram",
    name: "Κυνηγός Πανγκράμ",
    hint: "Βρες πανγκράμ σε ημερήσια παζλ.",
    kind: "tiered",
    tiers: [
      { id: "leksokipos-kynigos-pangram-chalkino", tier: "chalkino", threshold: 10, label: "Χάλκινο" },
      { id: "leksokipos-kynigos-pangram-asimenio", tier: "asimenio", threshold: 20, label: "Ασημένιο" },
      { id: "leksokipos-kynigos-pangram-chryso",   tier: "chryso",   threshold: 50, label: "Χρυσό" },
    ],
  },
  {
    id:   "leksokipos-syllektis-ponton",
    name: "Συλλέκτης Πόντων",
    hint: "Μάζεψε πόντους συνολικά.",
    kind: "tiered",
    tiers: [
      { id: "leksokipos-syllektis-ponton-chalkino", tier: "chalkino", threshold: 1000,  label: "Χάλκινο" },
      { id: "leksokipos-syllektis-ponton-asimenio", tier: "asimenio", threshold: 10000, label: "Ασημένιο" },
      { id: "leksokipos-syllektis-ponton-chryso",   tier: "chryso",   threshold: 25000, label: "Χρυσό" },
    ],
  },
];
