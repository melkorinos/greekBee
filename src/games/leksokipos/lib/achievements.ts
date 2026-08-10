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
 * The frozen one-shot achievement ids — the single source shared by the detector
 * (below) and the display catalog (LEKSOKIPOS_ACHIEVEMENTS). Referencing these
 * instead of re-typing the string literals keeps detection and catalog in
 * lock-step; a typo can't silently earn a non-existent badge. FROZEN on first deploy.
 *
 * Only the word-length ladder is left. Everything else the client could once decide
 * from an end-of-game snapshot now ladders on a lifetime count the server holds
 * (TICKET-02) — see the tier detectors near the bottom of this file.
 *
 * RETIRED, never to be reused: `leksokipos-first-daily` (Πρώτα Βήματα, deleted) and
 * `leksokipos-theristis` (superseded by the revived `leksokipos-tzimani`). Both are
 * frozen-id exceptions licensed by the pre-launch wipe and by nothing else — after
 * launch the rule is absolute again (ADR 0013 §4).
 */
export const LEKSOKIPOS_ONESHOT_IDS = {
  // Word-length ladder (exact length). Σιδηρόδρομος is the 10-letter rung.
  // FROZEN on first deploy like every other award id.
  sidirodromos: "leksokipos-sidirodromos",
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
// storage floor); the id and name per length are frozen display copy, here.

/**
 * Frozen id + display copy for each exact word length that has a badge.
 *
 * `tier` maps each length onto a rung of the Μακρυλέξης ladder (below). The four
 * lengths remain four independent earned facts — only their *presentation* is
 * laddered, so nothing about detection or storage changes.
 *
 * There is no per-length art: the ladder is ONE badge wearing four tier frames
 * (TICKET-03), so the four per-length emoji are gone and only the rung *labels*
 * survive. Nothing ever rendered them anyway — the Trophy Case tier chips are text.
 */
const WORD_LENGTH_BADGE_META: Record<
  number,
  { id: OneShotAchievementId; name: string; tier: TierName }
> = {
  10: { id: LEKSOKIPOS_ONESHOT_IDS.sidirodromos, name: "Σιδηρόδρομος", tier: "chalkino" },
  11: { id: LEKSOKIPOS_ONESHOT_IDS.wordLength11,  name: "Υπερταχεία",   tier: "asimenio" },
  12: { id: LEKSOKIPOS_ONESHOT_IDS.wordLength12,  name: "Νταλίκα",      tier: "chryso" },
  13: { id: LEKSOKIPOS_ONESHOT_IDS.wordLength13,  name: "Σεντόνι",      tier: "diamanti" },
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
  tier:   TierName;
}[] = TUNING.wordLengthBadges.map((length) => {
  const meta = WORD_LENGTH_BADGE_META[length];
  if (!meta) throw new Error(`No word-length badge meta for length ${length}`);
  return { length, ...meta };
});

export type AchievementKind = "oneshot" | "tiered";

/**
 * Tier rungs. The three metal names are the podium set used by the cumulative
 * badges (points, pangrams). `diamanti` is a fourth rung above gold, currently used
 * only by the word-length ladder, whose top rung (13 letters) is rarer than any
 * gold. A tier is a COLOUR (ring + soft disc) and nothing else — adding a name here
 * means adding its two `--tier-*` tokens in globals.css, not a new drawing.
 */
export type TierName = "chalkino" | "asimenio" | "chryso" | "diamanti";

/**
 * A badge's drawn art: one flattened path on a shared 24×24 canvas.
 *
 * Deliberately path DATA, never raw SVG markup — the catalog stays plain data that
 * no renderer has to trust, and BadgeMark owns the one `<svg>` element. The mark is
 * always painted in `currentColor` and never carries tier colour, which is what lets
 * five drawings serve every tier at every size (TICKET-03; the visual record is
 * `.claude/aiHelper/html/badge-visual-grill.html`).
 */
export interface BadgeMarkArt {
  path:    string;
  viewBox: string;
}

/** Every mark shares this canvas, so one component can scale all five. */
const MARK_VIEWBOX = "0 0 24 24";

/**
 * The five drawings. Each is one flattened path — Τζιμάνι's six petals are twelve
 * arcs rather than six `<ellipse>` elements for exactly that reason.
 *
 * Τζιμάνι's petals are generated from FlowerGrid's own construction (six ellipses,
 * major axis radial, at the board's real proportions petalLength 46 / petalWidth 37 /
 * petalDist 90). If that geometry ever changes, this mark should follow it.
 */
const MARKS = {
  /** Στην Κορυφή — two peaks, the taller one behind. */
  korifi:  "M14 3.2 22 20.4H6zM6.8 9.8 12.6 20.4H2z",
  /** Μακρυλέξης — rails and sleepers, the ladder of lengths. */
  grammes: "M9.6 3h1.6L4.6 21H1.4zM12.8 3h1.6L22.6 21h-3.2zM8.2 9h7.6v1.9H8.2zM5.8 15.6h12.4v2.1H5.8z",
  /** Τζιμάνι — the Leksokipos flower itself. */
  petala:  "M12.00 8.90A3.8 3.2 -90.00 0 1 12.00 1.30A3.8 3.2 -90.00 0 1 12.00 8.90ZM14.68 10.45A3.8 3.2 -30.00 0 1 21.27 6.65A3.8 3.2 -30.00 0 1 14.68 10.45ZM14.68 13.55A3.8 3.2 30.00 0 1 21.27 17.35A3.8 3.2 30.00 0 1 14.68 13.55ZM12.00 15.10A3.8 3.2 90.00 0 1 12.00 22.70A3.8 3.2 90.00 0 1 12.00 15.10ZM9.32 13.55A3.8 3.2 150.00 0 1 2.73 17.35A3.8 3.2 150.00 0 1 9.32 13.55ZM9.32 10.45A3.8 3.2 210.00 0 1 2.73 6.65A3.8 3.2 210.00 0 1 9.32 10.45Z",
  /** Κυνηγός Πανγκράμ — a bolt: the whole alphabet in one word. */
  keravnos: "M14.2 2.2 3.6 13.9h5.9l-1 7.9L20.4 10.1h-6.1z",
  /** Συλλέκτης Πόντων — a cut gem, points accumulated. */
  lithos:  "M7.6 2.6h8.8l4.8 6.4L12 21.4 2.8 9z",
} as const;

/** Wrap a raw path in the shared canvas — the catalog never repeats the viewBox. */
const mark = (path: string): BadgeMarkArt => ({ path, viewBox: MARK_VIEWBOX });

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
  /** The badge's drawn art. One per badge — tiers reframe it, they never redraw it. */
  mark:   BadgeMarkArt;
  kind:   AchievementKind;
  tiers?: readonly AchievementTier[];
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
 *
 * Word lengths are all that survives here: they are the only accomplishment a single
 * round can settle by itself. Reaching the top rank and crossing the found-word
 * ratio still happen in-round, but what the rebuilt catalog awards is the *number of
 * days* either has happened — a lifetime count only the server holds. Those rounds
 * are recorded by detectDayMilestones below and the tiers crossed by
 * detectEarnedTopRankTiers / detectEarnedTzimaniTiers.
 */
export function detectEarnedAchievements(ctx: AchievementContext): OneShotAchievementId[] {
  const earned: OneShotAchievementId[] = [];

  // Achievements are earned on daily puzzles only — custom/random puzzles don't post.
  if (!ctx.isDaily) return earned;

  // Word-length ladder — a word of EXACTLY N letters earns the N badge (not ≥).
  for (const { length, id } of WORD_LENGTH_BADGES) {
    if (ctx.foundWords.some((w) => w.length === length)) earned.push(id);
  }

  return earned;
}

// ─── Day milestones (player_milestones counters) ──────────────────────────────
//
// The one-shots above answer "has this player ever…". The rebuilt catalog also
// wants "on how many DAYS has this player…", which no end-of-game snapshot can
// know — it needs a row per qualifying day on the server (ADR 0013). Detection of
// the qualifying condition is still pure and still client-side; this returns what
// the round earned, and the sync lane owns posting it.
//
// Both conditions are monotonic within a session (finding more words never drops
// the ratio, and rank never falls), so posting the moment one first holds is safe.

/** A milestone this round qualifies for, ready to POST to /api/milestones. */
export interface DayMilestone {
  kind: "top_rank" | "tzimani";
  /**
   * Percentage of the puzzle's words found, on tzimani only. The one calibration
   * signal the 70% threshold can be re-tuned from later — nothing else records the
   * found-word ratio. Absent on top_rank: a day either reached the top or did not.
   */
  value?: number;
}

/**
 * The day-milestones this end-of-game snapshot qualifies for. Empty for a
 * non-daily puzzle (milestones are keyed on a puzzle_date) and for a puzzle with no
 * valid words. Insert-if-absent on the server makes re-posting a no-op.
 */
export function detectDayMilestones(ctx: AchievementContext): DayMilestone[] {
  if (!ctx.isDaily || ctx.validWordCount <= 0) return [];

  const milestones: DayMilestone[] = [];

  if (ctx.rank === TOP_RANK) {
    milestones.push({ kind: "top_rank" });
  }

  const foundRatio = ctx.foundWords.length / ctx.validWordCount;
  if (foundRatio >= TUNING.tzimaniFoundRatio) {
    milestones.push({ kind: "tzimani", value: Math.round(foundRatio * 100) });
  }

  return milestones;
}

/** Frozen id of the lifetime-points tiered badge — shared by the catalog + detector. */
export const SYLLEKTIS_PONTON_ID = "leksokipos-syllektis-ponton";

/** Frozen id of the lifetime-pangram tiered badge — shared by the catalog + detector. */
export const KYNIGOS_PANGRAM_ID = "leksokipos-kynigos-pangram";

/** Frozen id of the top-rank-days tiered badge — shared by the catalog + detector. */
export const STIN_KORIFI_ID = "leksokipos-stin-korifi";

/**
 * Frozen id of the found-ratio-days tiered badge — shared by the catalog + detector.
 *
 * REVIVED, not new: this id was retired on 2026-07-18 with the perfect-round concept
 * and is brought back for the 70% badge, in preference to keeping
 * `leksokipos-theristis` under new display copy — an id and a name that disagree
 * would disagree forever. Licensed by the pre-launch wipe alone (ADR 0013 §4).
 */
export const TZIMANI_ID = "leksokipos-tzimani";

/**
 * Frozen id of the word-length ladder — the base id a player selects for display.
 * NOTE: this base id is never itself awarded; only its rungs (the frozen
 * leksokipos-sidirodromos / -word-11 / -word-12 / -word-13 ids) are earned facts.
 */
export const MAKRYLEXIS_ID = "leksokipos-makrylexis";

/**
 * The ladder's rungs, ascending — one per exact length, reusing the FROZEN
 * word-length ids as tier ids so no row in player_achievements changes meaning.
 * `threshold` is the word length itself, which lets the generic tier helpers work
 * unchanged. Unlike the cumulative badges these rungs are earned by exact-length
 * match, so they are not monotonic: a player can hold rung 13 without rung 10, and
 * resolveDisplayBadge's highest-earned-wins walk still shows the rarest one held.
 */
const MAKRYLEXIS_TIERS: readonly AchievementTier[] = WORD_LENGTH_BADGES.map((b) => ({
  id:        b.id,
  tier:      b.tier,
  threshold: b.length,
  label:     b.name,
}));

/** The three metal thresholds a cumulative badge ladders on, from achievementTuning. */
interface MetalThresholds {
  chalkino: number;
  asimenio: number;
  chryso:   number;
}

/**
 * The standard three-rung ladder every cumulative badge wears: tier ids are
 * `${baseId}-${tier}`, labels are the Greek metal words, thresholds come from
 * tuning. Four badges share this shape, so deriving it keeps a tier id from ever
 * being mistyped into a permanent junk row.
 *
 * Μακρυλέξης does NOT use this — its rungs reuse the pre-existing frozen
 * word-length ids and it has a fourth rung above gold.
 */
function metalTiers(baseId: string, thresholds: MetalThresholds): readonly AchievementTier[] {
  return [
    { id: `${baseId}-chalkino`, tier: "chalkino", threshold: thresholds.chalkino, label: "Χάλκινο" },
    { id: `${baseId}-asimenio`, tier: "asimenio", threshold: thresholds.asimenio, label: "Ασημένιο" },
    { id: `${baseId}-chryso`,   tier: "chryso",   threshold: thresholds.chryso,   label: "Χρυσό" },
  ];
}

export const LEKSOKIPOS_ACHIEVEMENTS: readonly Achievement[] = [
  {
    id:   STIN_KORIFI_ID,
    name: "Στην Κορυφή",
    hint: "Φτάσε στην κατάταξη Απολυτότητα σε ημερήσια παζλ.",
    mark: mark(MARKS.korifi),
    kind: "tiered",
    tiers: metalTiers(STIN_KORIFI_ID, TUNING.topRankTierThresholds),
  },
  // Word-length ladder — ONE badge with a rung per exact length. Each rung is still
  // its own frozen earned fact (detection is unchanged); grouping them here means the
  // player picks/displays one climbing badge instead of four unrelated ones, and the
  // rarest rung is the one that shows.
  {
    id:   MAKRYLEXIS_ID,
    name: "Μακρυλέξης",
    hint: "Βρες μεγάλες λέξεις — όσο πιο μεγάλες, τόσο πιο ψηλά.",
    mark: mark(MARKS.grammes),
    kind: "tiered",
    tiers: MAKRYLEXIS_TIERS,
  },
  {
    id:   TZIMANI_ID,
    name: "Τζιμάνι",
    hint: `Βρες το ${Math.round(TUNING.tzimaniFoundRatio * 100)}% των λέξεων σε ημερήσια παζλ.`,
    mark: mark(MARKS.petala),
    kind: "tiered",
    tiers: metalTiers(TZIMANI_ID, TUNING.tzimaniTierThresholds),
  },
  {
    id:   KYNIGOS_PANGRAM_ID,
    name: "Κυνηγός Πανγκράμ",
    hint: "Βρες πανγκράμ σε ημερήσια παζλ.",
    mark: mark(MARKS.keravnos),
    kind: "tiered",
    tiers: metalTiers(KYNIGOS_PANGRAM_ID, TUNING.pangramTierThresholds),
  },
  {
    id:   SYLLEKTIS_PONTON_ID,
    name: "Συλλέκτης Πόντων",
    hint: "Μάζεψε πόντους συνολικά.",
    mark: mark(MARKS.lithos),
    kind: "tiered",
    tiers: metalTiers(SYLLEKTIS_PONTON_ID, TUNING.pointsTierThresholds),
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

/** The top-rank-days badge's tiers, ascending — the single source for detection + progress. */
export const STIN_KORIFI_TIERS: readonly AchievementTier[] =
  LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === STIN_KORIFI_ID)?.tiers ?? [];

/** The found-ratio-days badge's tiers, ascending — the single source for detection + progress. */
export const TZIMANI_TIERS: readonly AchievementTier[] =
  LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === TZIMANI_ID)?.tiers ?? [];

// ─── Tiered-badge detection (async lanes) ─────────────────────────────────────
//
// Tiered badges cross on a LIFETIME cumulative value the client doesn't hold at
// end-of-game (points, pangram-set size), so unlike the one-shots they are fed an
// async read-back of /api/profile/stats (ADR 0013 lane C: cumulative → crossing).
// Pure here; the hook owns the fetch. Both detectors return EVERY crossed tier id
// (ascending) — the server insert-if-absents, so re-returning an earned tier is a
// harmless no-op. The generic core is shared so a further tiered badge adds no copy.

/**
 * Tier ids whose threshold `value` has reached (>=), ascending.
 *
 * Exported because the Trophy Case needs the SAME crossing rule to decide which
 * chips light: re-rolling `value >= t.threshold` on the display side is how the
 * Profile Page starts disagreeing with the game about which tier a player holds.
 */
export function detectEarnedTiers(tiers: readonly AchievementTier[], value: number): string[] {
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

/**
 * Tier ids whose threshold the lifetime top-rank DAY count has reached (>=), ascending.
 *
 * The count is a COUNT(*) over player_milestones where kind='top_rank' — one row per
 * qualifying day, never a stored tally. Bronze at 1 means the first top-rank day
 * earns the badge, exactly as the one-shot this replaces did.
 */
export function detectEarnedTopRankTiers(topRankDays: number): string[] {
  return detectEarnedTiers(STIN_KORIFI_TIERS, topRankDays);
}

/**
 * Tier ids whose threshold the lifetime Τζιμάνι DAY count has reached (>=), ascending.
 *
 * The count is a COUNT(*) over player_milestones where kind='tzimani'. Every rung
 * qualifies at the same `tzimaniFoundRatio`: the ladder counts days, it does not
 * climb the percentage.
 */
export function detectEarnedTzimaniTiers(tzimaniDays: number): string[] {
  return detectEarnedTiers(TZIMANI_TIERS, tzimaniDays);
}

/** What the unlock toast shows for an earned id. */
export interface EarnedDisplay {
  name:      string;
  /**
   * The BASE badge's drawn art. A tier is a frame, never its own drawing, so this
   * is the same mark whichever rung was just earned — and it is the only way the
   * toast can draw the right badge, since what it is handed is a TIER id.
   */
  mark:      BadgeMarkArt;
  /** Greek tier word (Χάλκινο/Ασημένιο/Χρυσό), present only for tier ids. */
  tierLabel?: string;
  /**
   * The rung just earned, for the badge FRAME. `tierLabel` is display copy and
   * cannot be mapped back to a colour; without this the toast would draw the
   * neutral frame, which is exactly what a LOCKED badge looks like.
   */
  tier?:     TierName;
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
    if (a.id === id) return { name: a.name, mark: a.mark };
    const tier = a.tiers?.find((t) => t.id === id);
    if (tier) return { name: a.name, mark: a.mark, tierLabel: tier.label, tier: tier.tier };
  }
  return null;
}

// ─── Player-selected display badge (Handoff B) ────────────────────────────────
//
// A player picks ONE earned achievement in the Trophy Case; that badge renders
// beside their name on every leaderboard. What is STORED is the BASE achievement
// id (never a tier id); the displayed tier is resolved at READ time from the
// device's earned tier rows, so a later tier upgrade needs no write-back.

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
