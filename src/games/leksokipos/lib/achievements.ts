// achievements — the Leksokipos trophy catalog + one-shot detection (pure, zero React).
//
// Epic A (shipped): the 5 one-shot predicates below, the player_achievements
// table, the /api/achievements earn endpoint, and TrophyCase earned-lighting are
// all live. Storage/merge/retention decisions: ADR 0013. The 2 tiered badges
// still render locked — their per-tier detection + progress display is Epic B.
//
// Frozen ids: each `id` (and each tier `id`) becomes player_achievements.achievement_id
// and FREEZES on first deploy. Renaming/removing an id is forbidden after ship;
// adding new tiers later is non-breaking.

import { LEKSOKIPOS_ACHIEVEMENT_TUNING as TUNING } from "@/config/achievementTuning";
import { RANKS, type RankName } from "./ranking";

/** The highest rank on the ladder — reaching it earns Στην Κορυφή. Derived, never hardcoded. */
const TOP_RANK: RankName = RANKS[RANKS.length - 1].name;

/**
 * The five frozen one-shot achievement ids — the single source shared by the
 * detector (below) and the display catalog (LEKSOKIPOS_ACHIEVEMENTS). Referencing
 * these instead of re-typing the string literals keeps detection and catalog in
 * lock-step; a typo can't silently earn a non-existent badge. FROZEN on first deploy.
 */
export const LEKSOKIPOS_ONESHOT_IDS = {
  firstDaily:   "leksokipos-first-daily",
  stinKorifi:   "leksokipos-stin-korifi",
  tzimani:      "leksokipos-tzimani",
  sidirodromos: "leksokipos-sidirodromos",
  theristis:    "leksokipos-theristis",
} as const;

export type OneShotAchievementId =
  (typeof LEKSOKIPOS_ONESHOT_IDS)[keyof typeof LEKSOKIPOS_ONESHOT_IDS];

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

// ─── Detection ─────────────────────────────────────────────────────────────
//
// Pure, client-side, fired at end-of-game (ADR 0013). The server runs zero
// detection; it only insert-if-absents the ids returned here. Only the 5
// one-shot badges are detected in Epic A — the tiered badges stay locked.

/** End-of-game snapshot the one-shot predicates read. Mirrors what GameBoard holds. */
export interface AchievementContext {
  /** Only daily puzzles earn achievements — custom/random puzzles never do. */
  isDaily:        boolean;
  /** The distinct words the player found this round. */
  foundWords:     string[];
  /** Total number of valid words in the puzzle. */
  validWordCount: number;
  /** The player's rank at end-of-game. */
  rank:           RankName;
}

/**
 * Returns the ids of the one-shot achievements this end-of-game snapshot earns.
 * Insert-if-absent on the server makes each "earned forever"; re-earning is a no-op.
 */
export function detectEarnedAchievements(ctx: AchievementContext): OneShotAchievementId[] {
  const earned: OneShotAchievementId[] = [];

  // Achievements are earned on daily puzzles only — custom/random puzzles don't post.
  if (!ctx.isDaily) return earned;

  if (ctx.foundWords.length > 0) {
    earned.push(LEKSOKIPOS_ONESHOT_IDS.firstDaily);
  }

  if (ctx.foundWords.some((w) => w.length >= TUNING.sidirodromosMinLetters)) {
    earned.push(LEKSOKIPOS_ONESHOT_IDS.sidirodromos);
  }

  if (
    ctx.validWordCount > 0 &&
    ctx.foundWords.length / ctx.validWordCount >= TUNING.theristisFoundRatio
  ) {
    earned.push(LEKSOKIPOS_ONESHOT_IDS.theristis);
  }

  if (ctx.validWordCount > 0 && ctx.foundWords.length >= ctx.validWordCount) {
    earned.push(LEKSOKIPOS_ONESHOT_IDS.tzimani);
  }

  if (ctx.rank === TOP_RANK) {
    earned.push(LEKSOKIPOS_ONESHOT_IDS.stinKorifi);
  }

  return earned;
}

export const LEKSOKIPOS_ACHIEVEMENTS: readonly Achievement[] = [
  {
    id:   LEKSOKIPOS_ONESHOT_IDS.firstDaily,
    name: "Πρώτα Βήματα",
    hint: "Παίξε το πρώτο σου ημερήσιο παζλ.",
    kind: "oneshot",
  },
  {
    id:   LEKSOKIPOS_ONESHOT_IDS.stinKorifi,
    name: "Στην Κορυφή",
    hint: "Φτάσε στην κατάταξη Απολυτότητα σε ένα ημερήσιο παζλ.",
    kind: "oneshot",
  },
  {
    id:   LEKSOKIPOS_ONESHOT_IDS.tzimani,
    name: "Τζιμάνι",
    hint: "Βρες όλες τις λέξεις ενός ημερήσιου παζλ.",
    kind: "oneshot",
  },
  {
    id:   LEKSOKIPOS_ONESHOT_IDS.sidirodromos,
    name: "Σιδηρόδρομος",
    hint: `Βρες μια λέξη με ${TUNING.sidirodromosMinLetters}+ γράμματα.`,
    kind: "oneshot",
  },
  {
    id:   LEKSOKIPOS_ONESHOT_IDS.theristis,
    name: "Θεριστής",
    hint: `Βρες το ${Math.round(TUNING.theristisFoundRatio * 100)}% των λέξεων ενός ημερήσιου παζλ.`,
    kind: "oneshot",
  },
  {
    id:   "leksokipos-kynigos-pangram",
    name: "Κυνηγός Πανγκράμ",
    hint: "Βρες πανγκράμ σε ημερήσια παζλ.",
    kind: "tiered",
    tiers: [
      { id: "leksokipos-kynigos-pangram-chalkino", tier: "chalkino", threshold: TUNING.pangramTierThresholds.chalkino, label: "Χάλκινο" },
      { id: "leksokipos-kynigos-pangram-asimenio", tier: "asimenio", threshold: TUNING.pangramTierThresholds.asimenio, label: "Ασημένιο" },
      { id: "leksokipos-kynigos-pangram-chryso",   tier: "chryso",   threshold: TUNING.pangramTierThresholds.chryso,   label: "Χρυσό" },
    ],
  },
  {
    id:   "leksokipos-syllektis-ponton",
    name: "Συλλέκτης Πόντων",
    hint: "Μάζεψε πόντους συνολικά.",
    kind: "tiered",
    tiers: [
      { id: "leksokipos-syllektis-ponton-chalkino", tier: "chalkino", threshold: TUNING.pointsTierThresholds.chalkino, label: "Χάλκινο" },
      { id: "leksokipos-syllektis-ponton-asimenio", tier: "asimenio", threshold: TUNING.pointsTierThresholds.asimenio, label: "Ασημένιο" },
      { id: "leksokipos-syllektis-ponton-chryso",   tier: "chryso",   threshold: TUNING.pointsTierThresholds.chryso,   label: "Χρυσό" },
    ],
  },
];

/**
 * Every valid achievement id (one-shots + each tier id), derived from the catalog.
 * The earn endpoint rejects anything not in this set — the table is append-forever,
 * so an unknown id would be permanent junk. This is an id whitelist, not detection.
 */
export const ALL_ACHIEVEMENT_IDS: ReadonlySet<string> = new Set(
  LEKSOKIPOS_ACHIEVEMENTS.flatMap((a) => [a.id, ...(a.tiers?.map((t) => t.id) ?? [])]),
);
