// GET  /api/nominations?direction=add|remove — list nominations sorted by vote count
// POST /api/nominations — submit a new nomination (add or remove)

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import { isBlockedWord } from "@/lib/nominationBlocklist";
import { normalizeLetters } from "@/lib/normalize";

export const runtime = "edge";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const direction = req.nextUrl.searchParams.get("direction");
  // Optional: when supplied, each row is stamped with this device's own vote
  // (my_vote) so the client can highlight what the player already voted for.
  const deviceId  = req.nextUrl.searchParams.get("deviceId");
  if (direction !== "add" && direction !== "remove") {
    return NextResponse.json({ error: "direction must be 'add' or 'remove'" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Fetch pending nominations for this direction with their vote counts.
  // Supabase doesn't do aggregates inline, so we fetch votes separately and merge.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nominations, error: nomError } = await (supabase.from("nominations") as any)
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
    .select("nomination_id, vote_type")
    .in("nomination_id", ids);

  if (voteError) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // Count up/down votes per nomination.
  const voteCounts: Record<string, { up: number; down: number }> = {};
  for (const v of votes ?? []) {
    if (!voteCounts[v.nomination_id]) voteCounts[v.nomination_id] = { up: 0, down: 0 };
    if (v.vote_type === "down") voteCounts[v.nomination_id].down++;
    else                        voteCounts[v.nomination_id].up++;
  }

  // When a deviceId is supplied, fetch just this device's votes so we can tell the
  // client which way it already voted on each row (persists across reloads/tabs).
  const myVotes: Record<string, "up" | "down"> = {};
  if (deviceId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mine } = await (supabase.from("nomination_votes") as any)
      .select("nomination_id, vote_type")
      .eq("device_id", deviceId)
      .in("nomination_id", ids) as { data: Array<{ nomination_id: string; vote_type: string }> | null };
    for (const v of mine ?? []) {
      myVotes[v.nomination_id] = v.vote_type === "down" ? "down" : "up";
    }
  }

  const result = nominations
    .map((n) => ({
      id:             n.id,
      word:           n.word,
      player_name:    n.player_name,
      note:           n.note,
      upvote_count:   voteCounts[n.id]?.up   ?? 0,
      downvote_count: voteCounts[n.id]?.down ?? 0,
      my_vote:        deviceId ? (myVotes[n.id] ?? null) : null,
      created_at:     n.created_at,
    }))
    .sort((a, b) => (b.upvote_count - b.downvote_count) - (a.upvote_count - a.downvote_count));

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

  // Normalise the same way the dictionary is stored (accent-stripped, final
  // sigma collapsed) so "καλός"/"καλος"/"καλοσ" all resolve to one word — this
  // is what makes the duplicate/pending lookup actually collapse variants.
  const normalised = normalizeLetters(word).trim();

  if (!normalised) {
    return NextResponse.json({ error: "word required" }, { status: 400 });
  }

  // Reject proposals to ADD a blocklisted word (proper noun / month / place /
  // foreign word). Authoritative guard — the client warns first, but never
  // trust the client. Removal reports are unaffected.
  if (direction === "add" && isBlockedWord(normalised)) {
    return NextResponse.json({ error: "blocked_word" }, { status: 422 });
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("nominations") as any).insert({
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
