// POST /api/milestones — record a device's badge inputs and return the fresh
// counts for the kinds it just wrote.
//
// One route replacing /api/pangrams and /api/words (ADR 0013 /
// .claude/handoffs/badgeIdeas.md). Storage = append-only fact rows in
// player_milestones: one row per milestone a device reached on one puzzle_date,
// across four kinds (pangram / word / top_rank / tzimani). Writing is
// INSERT ... ON CONFLICT (device_uuid,puzzle_date,kind,detail) DO NOTHING — modelled
// via supabase upsert with ignoreDuplicates: true — so a re-submitted milestone is a
// no-op (retry-safe) and the same word on a different day counts again.
//
// The server runs ZERO detection (ADR 0013): it writes what the client posts,
// shape-bounded by sanitizeMilestones, and the client decides tier crossings. It
// DOES stamp `value` server-side for kind='word' (the word's length), so the
// per-length read aggregates on a column and never fetches rows.
//
// Two cost rules, both load-bearing rather than tidiness:
//
//   1. Counts come back ONLY for the kinds actually inserted. A lane that needs a
//      crossing gets it in this same round-trip with no lag (what ADR 0013 B2
//      engineered for pangrams); a lane that writes something else pays nothing for
//      counts it would ignore.
//   2. The count aggregate is SKIPPED ENTIRELY when the insert wrote no new row.
//      Nothing written means no total changed, so there is nothing to re-read. This
//      was a live inefficiency in the /api/words route this one replaces, where the
//      lane fired per found word and almost always wrote nothing.
//
// Both rest on `.select("kind")` after the upsert: ON CONFLICT DO NOTHING ...
// RETURNING yields only the rows that were genuinely new, so the returned kinds are
// exactly the set whose totals moved.

import { NextResponse, type NextRequest } from "next/server";

import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getSupabaseClient, table } from "@/lib/supabase";
import { isISODate } from "@/lib/puzzleDate";
import { sanitizeMilestones } from "@/games/leksokipos/lib/milestones";

export const runtime = "edge";

interface MilestonesPayload {
  device_uuid: string;
  puzzle_date: string;
  milestones:  unknown;
}

/** One row of the player_milestone_counts aggregate. */
interface KindCount {
  kind:  string;
  count: number;
}

export async function POST(req: NextRequest) {
  const parsed = await parseJson<MilestonesPayload>(req);
  if (!parsed.ok) return parsed.response;

  const { device_uuid, puzzle_date, milestones } = parsed.body;

  if (!device_uuid || typeof puzzle_date !== "string" || !isISODate(puzzle_date)) {
    return jsonMessage("Missing or invalid fields");
  }

  const clean = sanitizeMilestones(milestones);

  // Nothing worth writing — the client filters most word finds out before posting,
  // so this is the common case. Never reaches the database at all.
  if (clean.length === 0) {
    return NextResponse.json({ counts: {} });
  }

  const supabase = getSupabaseClient();

  const rows = clean.map(({ kind, detail, value }) => ({
    device_uuid,
    puzzle_date,
    kind,
    detail,
    value,
  }));

  // RETURNING gives back only the rows ON CONFLICT DO NOTHING actually inserted —
  // which is how we know whose totals moved. Only the kind column crosses the wire.
  const { data: inserted, error: insertError } = await table(supabase, "player_milestones")
    .upsert(rows, { onConflict: "device_uuid,puzzle_date,kind,detail", ignoreDuplicates: true })
    .select("kind");

  if (insertError) return jsonError("db_error", insertError.message);

  const insertedKinds = new Set(((inserted as { kind: string }[]) ?? []).map((r) => r.kind));

  // Cost rule 2 — every milestone was already on record, so no count can have
  // changed and the aggregate is skipped outright.
  if (insertedKinds.size === 0) {
    return NextResponse.json({ counts: {} });
  }

  const { data: aggregate, error: countError } = await supabase.rpc("player_milestone_counts", {
    p_device_uuid: device_uuid,
  });

  if (countError) return jsonError("db_error", countError.message);

  // Cost rule 1 — narrow the aggregate to the kinds this caller actually wrote.
  const totals = new Map(((aggregate as KindCount[]) ?? []).map((r) => [r.kind, r.count]));
  const counts: Record<string, number> = {};
  for (const kind of insertedKinds) {
    counts[kind] = totals.get(kind) ?? 0;
  }

  return NextResponse.json({ counts });
}
