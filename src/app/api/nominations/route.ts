// GET  /api/nominations?direction=add|remove — list nominations sorted by vote count
// POST /api/nominations — submit a new nomination (add or remove)

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import wordsEl from "@/data/words-el.json";

export const runtime = "edge";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const direction = req.nextUrl.searchParams.get("direction");
  if (direction !== "add" && direction !== "remove") {
    return NextResponse.json({ error: "direction must be 'add' or 'remove'" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Fetch pending nominations for this direction with their vote counts.
  // Supabase doesn't do aggregates inline, so we fetch votes separately and merge.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nominations, error: nomError } = await (supabase.from("word_suggestions") as any)
    .select("id, word, player_name, note, created_at")
    .eq("direction", direction)
    .eq("status", "pending")
    .order("created_at", { ascending: false }) as { data: Array<{ id: string; word: string; player_name: string | null; note: string | null; created_at: string }> | null; error: unknown };

  if (nomError) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (!nominations || nominations.length === 0) {
    return NextResponse.json([]);
  }

  const ids = nominations.map((n) => n.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: votes, error: voteError } = await (supabase.from("nomination_votes") as any)
    .select("nomination_id")
    .in("nomination_id", ids);

  if (voteError) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // Count votes per nomination.
  const voteCounts: Record<string, number> = {};
  for (const v of votes ?? []) {
    voteCounts[v.nomination_id] = (voteCounts[v.nomination_id] ?? 0) + 1;
  }

  const result = nominations
    .map((n) => ({
      id:          n.id,
      word:        n.word,
      player_name: n.player_name,
      note:        n.note,
      vote_count:  voteCounts[n.id] ?? 0,
      created_at:  n.created_at,
    }))
    .sort((a, b) => b.vote_count - a.vote_count);

  return NextResponse.json(result);
}

// ── POST ──────────────────────────────────────────────────────────────────────

interface NominationPayload {
  word:        string;
  direction:   "add" | "remove";
  playerName?: string;
  note?:       string;
  deviceId:    string;
}

export async function POST(req: NextRequest) {
  let body: NominationPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { word, direction, playerName, note, deviceId } = body;

  if (!word || typeof word !== "string") {
    return NextResponse.json({ error: "word required" }, { status: 400 });
  }
  if (direction !== "add" && direction !== "remove") {
    return NextResponse.json({ error: "direction must be 'add' or 'remove'" }, { status: 400 });
  }
  if (!deviceId || typeof deviceId !== "string") {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const normalised = word.toLowerCase().trim();

  // Removal nominations must target a word that actually exists in the word list.
  if (direction === "remove") {
    const wordList = wordsEl as string[];
    if (!wordList.includes(normalised)) {
      return NextResponse.json({ error: "word_not_in_list" }, { status: 400 });
    }
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("word_suggestions") as any).insert({
    word:        normalised,
    direction,
    player_name: playerName ?? null,
    note:        note ?? null,
    device_id:   deviceId,
    status:      "pending",
  });

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
