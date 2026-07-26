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
  sidirodromos: "leksokipos-sidirodromos",
  theristis:    "leksokipos-theristis",
  // Word-length ladder (exact length). Σιδηρόδρομος (above) is the 10-letter rung;
  // these extend it. FROZEN on first deploy like every other award id.
  wordLength11: "leksokipos-word-11",
  wordLength12: "leksokipos-word-12",
  wordLength13: "leksokipos-word-13",
} as const;

export type OneShotAchievementId =
  (typeof LEKSOKIPOS_ONESHOT_IDS)[keyof typeof LEKSOKIPOS_ONESHOT_IDS];

// ─── Word-length ladder (exact-length one-shots) ──────────────────────────────
//
// A found word of EXACTLY N letters earns the badge for N. Detection is `===`,
// never `>=`: a 13-letter find earns only the 13 badge, so each length is its own
// accomplishment. The lengths live in tuning (a balance knob + the player_words
// storage floor); the id/name/glyph per length are frozen display copy, here.

/** Frozen id + display copy for each exact word length that has a badge. */
const WORD_LENGTH_BADGE_META: Record<number, { id: OneShotAchievementId; name: string; glyph: string }> = {
  10: { id: LEKSOKIPOS_ONESHOT_IDS.sidirodromos, name: "Σιδηρόδρομος", glyph: "🚂" },
  11: { id: LEKSOKIPOS_ONESHOT_IDS.wordLength11,  name: "Υπερταχεία",   glyph: "🚄" },
  12: { id: LEKSOKIPOS_ONESHOT_IDS.wordLength12,  name: "Νταλίκα",      glyph: "🚛" },
  13: { id: LEKSOKIPOS_ONESHOT_IDS.wordLength13,  name: "Σεντόνι",      glyph: "🛏️" },
};

/**
 * The exact-length ladder, in the configured order. Lengths come from tuning; the
 * per-length id/copy come from the frozen meta above. If tuning ever lists a length
 * with no meta entry it throws at module load — a loud, immediate failure rather
 * than a silently missing badge.
 */
export const WORD_LENGTH_BADGES: readonly {
  length: number;
  id:     OneShotAchievementId;
  name:   string;
  glyph:  string;
}[] = TUNING.wordLengthBadges.map((length) => {
  const meta = WORD_LENGTH_BADGE_META[length];
  if (!meta) throw new Error(`No word-length badge meta for length ${length}`);
  return { length, ...meta };
});

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
  /** Single-emoji badge art — interim, swappable to icons later without a schema change. */
  glyph:  string;
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

  // Word-length ladder — a word of EXACTLY N letters earns the N badge (not ≥).
  for (const { length, id } of WORD_LENGTH_BADGES) {
    if (ctx.foundWords.some((w) => w.length === length)) earned.push(id);
  }

  if (
    ctx.validWordCount > 0 &&
    ctx.foundWords.length / ctx.validWordCount >= TUNING.theristisFoundRatio
  ) {
    earned.push(LEKSOKIPOS_ONESHOT_IDS.theristis);
  }

  if (ctx.rank === TOP_RANK) {
    earned.push(LEKSOKIPOS_ONESHOT_IDS.stinKorifi);
  }

  return earned;
}

/** Frozen id of the lifetime-points tiered badge — shared by the catalog + detector. */
export const SYLLEKTIS_PONTON_ID = "leksokipos-syllektis-ponton";

/** Frozen id of the lifetime-pangram tiered badge — shared by the catalog + detector. */
export const KYNIGOS_PANGRAM_ID = "leksokipos-kynigos-pangram";

export const LEKSOKIPOS_ACHIEVEMENTS: readonly Achievement[] = [
  {
    id:   LEKSOKIPOS_ONESHOT_IDS.firstDaily,
    name: "Πρώτα Βήματα",
    hint: "Παίξε το πρώτο σου ημερήσιο παζλ.",
    glyph: "🌱",
    kind: "oneshot",
  },
  {
    id:   LEKSOKIPOS_ONESHOT_IDS.stinKorifi,
    name: "Στην Κορυφή",
    hint: "Φτάσε στην κατάταξη Απολυτότητα σε ένα ημερήσιο παζλ.",
    glyph: "👑",
    kind: "oneshot",
  },
  // Word-length ladder — one one-shot per exact length (Σιδηρόδρομος = 10, …).
  ...WORD_LENGTH_BADGES.map((b): Achievement => ({
    id:   b.id,
    name: b.name,
    hint: `Βρες μια λέξη με ακριβώς ${b.length} γράμματα.`,
    glyph: b.glyph,
    kind: "oneshot",
  })),
  {
    id:   LEKSOKIPOS_ONESHOT_IDS.theristis,
    name: "Θεριστής",
    hint: `Βρες το ${Math.round(TUNING.theristisFoundRatio * 100)}% των λέξεων ενός ημερήσιου παζλ.`,
    glyph: "🌾",
    kind: "oneshot",
  },
  {
    id:   "leksokipos-kynigos-pangram",
    name: "Κυνηγός Πανγκράμ",
    hint: "Βρες πανγκράμ σε ημερήσια παζλ.",
    glyph: "✍️",
    kind: "tiered",
    tiers: [
      { id: "leksokipos-kynigos-pangram-chalkino", tier: "chalkino", threshold: TUNING.pangramTierThresholds.chalkino, label: "Χάλκινο" },
      { id: "leksokipos-kynigos-pangram-asimenio", tier: "asimenio", threshold: TUNING.pangramTierThresholds.asimenio, label: "Ασημένιο" },
      { id: "leksokipos-kynigos-pangram-chryso",   tier: "chryso",   threshold: TUNING.pangramTierThresholds.chryso,   label: "Χρυσό" },
    ],
  },
  {
    id:   SYLLEKTIS_PONTON_ID,
    name: "Συλλέκτης Πόντων",
    hint: "Μάζεψε πόντους συνολικά.",
    glyph: "💎",
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

/** The lifetime-points badge's tiers, ascending — the single source for detection + progress. */
export const SYLLEKTIS_PONTON_TIERS: readonly AchievementTier[] =
  LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === SYLLEKTIS_PONTON_ID)?.tiers ?? [];

/** The lifetime-pangram badge's tiers, ascending — the single source for detection + progress. */
export const KYNIGOS_PANGRAM_TIERS: readonly AchievementTier[] =
  LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === KYNIGOS_PANGRAM_ID)?.tiers ?? [];

// ─── Tiered-badge detection (async lanes) ─────────────────────────────────────
//
// Tiered badges cross on a LIFETIME cumulative value the client doesn't hold at
// end-of-game (points, pangram-set size), so unlike the one-shots they are fed an
// async read-back of /api/profile/stats (ADR 0013 lane C: cumulative → crossing).
// Pure here; the hook owns the fetch. Both detectors return EVERY crossed tier id
// (ascending) — the server insert-if-absents, so re-returning an earned tier is a
// harmless no-op. The generic core is shared so a further tiered badge adds no copy.

/** Tier ids whose threshold `value` has reached (>=), ascending. */
function detectEarnedTiers(tiers: readonly AchievementTier[], value: number): string[] {
  return tiers.filter((t) => value >= t.threshold).map((t) => t.id);
}

/**
 * The next threshold `value` has NOT yet reached — the "N" in the Trophy Case
 * "X / N" progress line. Null once every tier is crossed (no more goals). Generic
 * over any tiered badge's `tiers`, so the Trophy Case computes progress for any
 * badge without a per-badge next-threshold function.
 */
export function nextTierThreshold(tiers: readonly AchievementTier[], value: number): number | null {
  return tiers.find((t) => value < t.threshold)?.threshold ?? null;
}

/** Tier ids whose threshold `leksokiposPoints` has reached (>=), ascending. */
export function detectEarnedPointsTiers(leksokiposPoints: number): string[] {
  return detectEarnedTiers(SYLLEKTIS_PONTON_TIERS, leksokiposPoints);
}

/** The next points threshold not yet reached — Trophy Case "X / N" denominator; null when maxed. */
export function nextPointsTierThreshold(leksokiposPoints: number): number | null {
  return nextTierThreshold(SYLLEKTIS_PONTON_TIERS, leksokiposPoints);
}

/** Tier ids whose threshold the lifetime pangram count has reached (>=), ascending. */
export function detectEarnedPangramTiers(pangramCount: number): string[] {
  return detectEarnedTiers(KYNIGOS_PANGRAM_TIERS, pangramCount);
}

/** The next pangram threshold not yet reached — Trophy Case "X / N" denominator; null when maxed. */
export function nextPangramTierThreshold(pangramCount: number): number | null {
  return nextTierThreshold(KYNIGOS_PANGRAM_TIERS, pangramCount);
}

/** What the unlock toast shows for an earned id. */
export interface EarnedDisplay {
  name:      string;
  /** Greek tier word (Χάλκινο/Ασημένιο/Χρυσό), present only for tier ids. */
  tierLabel?: string;
}

/** A freshly-earned badge handed to the unlock toast (its id + display copy). */
export interface EarnedToast extends EarnedDisplay {
  id: string;
}

/**
 * Resolve any earned achievement id — one-shot OR per-tier — to its display copy,
 * so a toast can render a freshly-earned id without re-deriving the catalog. Null
 * for an unknown id (defensive; keeps a stray id from surfacing an empty toast).
 */
export function describeAchievement(id: string): EarnedDisplay | null {
  for (const a of LEKSOKIPOS_ACHIEVEMENTS) {
    if (a.id === id) return { name: a.name };
    const tier = a.tiers?.find((t) => t.id === id);
    if (tier) return { name: a.name, tierLabel: tier.label };
  }
  return null;
}

// ─── Player-selected display badge (Handoff B) ────────────────────────────────
//
// A player picks ONE earned achievement in the Trophy Case; that badge renders
// beside their name on every leaderboard. What is STORED is the BASE achievement
// id (never a tier id); the displayed tier is resolved at READ time from the
// device's earned tier rows, so a later tier upgrade needs no write-back.

/** Podium medal for each tier — shown beside the glyph for a tiered display badge. */
export const TIER_MEDALS: Record<TierName, string> = {
  chalkino: "🥉",
  asimenio: "🥈",
  chryso:   "🥇",
};

/**
 * The base ids a player may select as their display badge — every catalog entry,
 * never a per-tier id (tiers are resolved at read time, not selected directly).
 * The write endpoint rejects anything outside this set.
 */
export const SELECTABLE_BADGE_IDS: ReadonlySet<string> = new Set(
  LEKSOKIPOS_ACHIEVEMENTS.map((a) => a.id),
);

/** The catalog entry with this base id, or undefined. */
export function achievementById(id: string): Achievement | undefined {
  return LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * The earned `player_achievements.achievement_id`s that prove ownership of the
 * badge with this base id — its own id for a one-shot, any of its tier ids for a
 * tiered badge. Empty for an unknown id. The write endpoint uses this to reject a
 * selection the device has not actually earned.
 */
export function qualifyingEarnedIds(baseId: string): string[] {
  const a = achievementById(baseId);
  if (!a) return [];
  return a.tiers ? a.tiers.map((t) => t.id) : [a.id];
}

/** A resolved display badge: the base id + the highest earned tier (null for one-shots). */
export interface DisplayBadge {
  achievementId: string;
  tier:          TierName | null;
}

/**
 * Resolve a stored `selected_badge_id` against a device's earned ids into the
 * badge to render, at read time (ADR 0013 self-healing — a tier upgrade needs no
 * write-back). Null when there is nothing to show:
 *   - no selection, or an unknown selected id;
 *   - a tiered selection with no earned tier rows (a dangling selection, e.g. after
 *     a launch trophy reset). A one-shot trusts its stored id (validated at write).
 */
export function resolveDisplayBadge(
  selectedBadgeId: string | null,
  earnedIds:       readonly string[],
): DisplayBadge | null {
  if (!selectedBadgeId) return null;
  const a = achievementById(selectedBadgeId);
  if (!a) return null;

  if (!a.tiers) return { achievementId: a.id, tier: null };

  // Highest earned tier wins — walk ascending, keep the last one held.
  const owned = new Set(earnedIds);
  let highest: TierName | null = null;
  for (const t of a.tiers) {
    if (owned.has(t.id)) highest = t.tier;
  }
  return highest ? { achievementId: a.id, tier: highest } : null;
}
