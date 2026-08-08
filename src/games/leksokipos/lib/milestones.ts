// milestones.ts — pure route-input hygiene for POST /api/milestones (zero React).
//
// player_milestones is append-forever with anon INSERT (the 20260716120100
// posture), so junk written there is permanent and no id whitelist is possible for
// arbitrary words. We bound junk by SHAPE instead, dispatching on `kind`. This
// absorbs sanitizePangramWords and sanitizeFoundWords, which were the same idea
// over two tables.
//
// The server runs ZERO detection (ADR 0013): nothing here verifies a find against
// a puzzle. A "wrong" entry means a tampered request, not a gameplay bug.
//
// Per-kind rules, and why each one is where it is:
//   'word'     — ≥WORDS_MIN_TRACKED Greek letters; `value` = the length, stamped
//                SERVER-SIDE from the normalized word so the per-length read can
//                aggregate on an indexed column without fetching rows. The client
//                also filters to this floor, but that is an optimisation — this is
//                the authoritative rule.
//   'pangram'  — ≥7 Greek letters (a pangram uses all seven puzzle letters, so the
//                word floor must not leak onto it); no value.
//   'top_rank' — no detail, no value. A day either reached top rank or it didn't.
//   'tzimani'  — no detail; `value` carries the found-ratio percentage the day
//                crossed on, the one calibration signal the ladder can be re-tuned
//                from later. Only qualifying days are recorded, so it shows the
//                shape above the threshold and never the near-misses.
//
// `detail` is forced to '' on the two counter kinds rather than left to the client:
// Postgres treats NULLs as distinct in a unique index, and a client-chosen detail
// would let one day insert twice — either would silently break insert-if-absent,
// the guarantee the whole table rests on.

import { normalizeLetters } from "@/lib/normalize";
import { LEKSOKIPOS } from "@/config/gameRules";
import { WORDS_MIN_TRACKED } from "@/lib/wordsByLength";

/** The four milestone kinds. Deliberately not a DB CHECK constraint — see ADR 0013. */
export const MILESTONE_KINDS = ["pangram", "word", "top_rank", "tzimani"] as const;

export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

/** One row's worth of accepted input, ready for the route to stamp and insert. */
export interface SanitizedMilestone {
  kind:   MilestoneKind;
  detail: string;
  value:  number | null;
}

/**
 * Max milestones accepted per POST — bounds junk on the append-forever table. The
 * mount self-heal re-posts a round's whole qualifying set, which is now a handful
 * of long words plus a few pangrams, so this sits far above any real batch.
 */
export const MAX_MILESTONES_PER_REQUEST = 200;

/** A captured word: the game's own find floor up to a generous Greek-word bound. */
const WORD_SHAPE_RE = new RegExp(`^[α-ω]{${LEKSOKIPOS.MIN_WORD_LENGTH},24}$`);

/** A pangram: ≥7 letters (all seven puzzle letters) up to the same upper bound. */
const PANGRAM_SHAPE_RE = /^[α-ω]{7,24}$/;

const isKind = (k: unknown): k is MilestoneKind =>
  typeof k === "string" && (MILESTONE_KINDS as readonly string[]).includes(k);

/** Clamp a client-asserted percentage to a whole 0–100; null for anything else. */
function boundPercent(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Accept one raw entry, or null if its shape disqualifies it for its kind. */
function accept(entry: { kind: MilestoneKind; detail: unknown; value: unknown }): SanitizedMilestone | null {
  const { kind, detail, value } = entry;

  if (kind === "top_rank") return { kind, detail: "", value: null };
  if (kind === "tzimani")  return { kind, detail: "", value: boundPercent(value) };

  if (typeof detail !== "string") return null;
  const word = normalizeLetters(detail);

  if (kind === "pangram") {
    return PANGRAM_SHAPE_RE.test(word) ? { kind, detail: word, value: null } : null;
  }

  // kind === 'word'
  if (!WORD_SHAPE_RE.test(word) || word.length < WORDS_MIN_TRACKED) return null;
  return { kind, detail: word, value: word.length };
}

/**
 * Normalize and shape-check each candidate, drop what its kind disqualifies,
 * de-dupe on (kind, detail) so one batch cannot collide with itself, and cap the
 * batch. Returns [] for non-array input.
 */
export function sanitizeMilestones(input: unknown): SanitizedMilestone[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const out: SanitizedMilestone[] = [];

  for (const raw of input) {
    if (out.length >= MAX_MILESTONES_PER_REQUEST) break;
    if (typeof raw !== "object" || raw === null) continue;

    const { kind, detail, value } = raw as { kind: unknown; detail: unknown; value: unknown };
    if (!isKind(kind)) continue;

    const row = accept({ kind, detail, value });
    if (!row) continue;

    const dedupKey = `${row.kind}::${row.detail}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    out.push(row);
  }

  return out;
}
