// POST /api/wordle-scores — upsert one length result for a player on a given date
// GET  /api/wordle-scores?date=YYYY-MM-DD&deviceId= — daily aggregate leaderboard
//
// Score = sum of attempts across all 5 lengths (4–8).
// Missing lengths are treated as 7 (worse than a failed game) to penalise
// players who haven't yet played every length.
// Lower total = better rank.
//
// RLS: anon INSERT + anon SELECT (open leaderboard).
// Unique constraint on (device_id, puzzle_date, word_length) — safe upsert.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import { isISODate } from "@/games/spelling-bee/lib";

const WORDLE_LENGTHS = [4, 5, 6, 7, 8] as const;
const PENALTY        = 7; // attempts assigned to unplayed lengths

// ── POST ──────────────────────────────────────────────────────────────────────

interface ScorePayload {
  puzzle_date:  string;   // YYYY-MM-DD
  word_length:  number;   // 4–8
  device_id:    string;
  display_name: string;
  attempts:     number;   // 1–7 (7 = failed / did not solve)
}

export async function POST(req: NextRequest) {
  let body: ScorePayload;
  try {
    body = (await req.json()) as ScorePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { puzzle_date, word_length, device_id, display_name, attempts } = body;

  if (!puzzle_date || !device_id || typeof attempts !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isISODate(puzzle_date)) {
    return NextResponse.json({ error: "Invalid puzzle_date format" }, { status: 400 });
  }
  if (!WORDLE_LENGTHS.includes(word_length as (typeof WORDLE_LENGTHS)[number])) {
    return NextResponse.json({ error: "Invalid word_length" }, { status: 400 });
  }
  if (attempts < 1 || attempts > 7) {
    return NextResponse.json({ error: "attempts must be 1–7" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("wordle_scores") as any).upsert(
    {
      puzzle_date,
      word_length,
      device_id,
      display_name: (display_name ?? "").trim() || "Ανώνυμος",
      attempts,
    },
    { onConflict: "device_id,puzzle_date,word_length" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget: clean up rows older than 7 days.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  void (supabase.from("wordle_scores") as any).delete().lt("puzzle_date", cutoffStr);

  return NextResponse.json({ ok: true });
}

// ── GET ───────────────────────────────────────────────────────────────────────

interface RawRow {
  device_id:    string;
  display_name: string;
  word_length:  number;
  attempts:     number;
}

interface AggregatedPlayer {
  device_id:    string;
  display_name: string;
  total:        number; // sum of attempts (lower = better)
}

export async function GET(req: NextRequest) {
  const date     = req.nextUrl.searchParams.get("date") ?? "";
  const deviceId = req.nextUrl.searchParams.get("deviceId") ?? "";

  if (!date || !isISODate(date)) {
    return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase.from("wordle_scores") as any)
    .select("device_id, display_name, word_length, attempts")
    .eq("puzzle_date", date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rawRows: RawRow[] = (rows as RawRow[]) ?? [];

  // Aggregate per player: sum attempts, fill missing lengths with PENALTY
  const playerMap = new Map<string, AggregatedPlayer>();
  for (const row of rawRows) {
    if (!playerMap.has(row.device_id)) {
      playerMap.set(row.device_id, {
        device_id:    row.device_id,
        display_name: row.display_name,
        total:        WORDLE_LENGTHS.length * PENALTY, // start with all penalised
      });
    }
    const p = playerMap.get(row.device_id)!;
    // Replace one PENALTY slot with the actual attempts
    p.total = p.total - PENALTY + row.attempts;
    // Keep the latest display_name (in case player updated it mid-session)
    p.display_name = row.display_name;
  }

  // Sort ascending (lower total = better)
  const sorted: AggregatedPlayer[] = [...playerMap.values()].sort(
    (a, b) => a.total - b.total
  );

  const top20 = sorted.slice(0, 20).map((p, i) => ({
    rank:         i + 1,
    display_name: p.display_name,
    score:        p.total,
    isPlayer:     p.device_id === deviceId,
  }));

  // If the player is already in top20, no pinned row needed
  const playerInTop20 = top20.some((r) => r.isPlayer);
  let playerRow: {
    rank:         number;
    display_name: string;
    score:        number;
    isPlayer:     true;
  } | null = null;

  if (!playerInTop20 && deviceId && playerMap.has(deviceId)) {
    const p     = playerMap.get(deviceId)!;
    const rank  = sorted.findIndex((s) => s.device_id === deviceId) + 1;
    playerRow = {
      rank,
      display_name: p.display_name,
      score:        p.total,
      isPlayer:     true,
    };
  }

  return NextResponse.json({ top20, playerRow });
}
