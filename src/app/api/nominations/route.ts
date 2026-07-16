// GET  /api/nominations?direction=add|remove — list nominations sorted by vote count
// POST /api/nominations — submit a new nomination (add or remove)

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getSupabaseClient, table } from "@/lib/supabase";
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
    return jsonMessage("direction must be 'add' or 'remove'");
  }

  const supabase = getSupabaseClient();

  // Fetch pending nominations for this direction with their vote counts.
  // Supabase doesn't do aggregates inline, so we fetch votes separately and merge.
  const { data: nominations, error: nomError } = await table(supabase, "nominations")
    .select("id, word, player_name, note, created_at")
    .eq("direction", direction)
    .eq("status", "pending")
    .order("created_at", { ascending: false }) as { data: Array<{ id: string; word: string; player_name: string | null; note: string | null; created_at: string }> | null; error: unknown };

  if (nomError) {
    return jsonError("db_error", nomError);
  }

  if (!nominations || nominations.length === 0) {
    return NextResponse.json([]);
  }

  const ids = nominations.map((n) => n.id);

  const { data: votes, error: voteError } = await table(supabase, "nomination_votes")
    .select("nomination_id, vote_type")
    .in("nomination_id", ids);

  if (voteError) {
    return jsonError("db_error", voteError);
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
    const { data: mine } = await table(supabase, "nomination_votes")
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
  const parsed = await parseJson<NominationPayload>(req);
  if (!parsed.ok) return parsed.response;

  const { word, direction, playerName, note, deviceId } = parsed.body;

  if (!word || typeof word !== "string") {
    return jsonMessage("word required");
  }
  if (direction !== "add" && direction !== "remove") {
    return jsonMessage("direction must be 'add' or 'remove'");
  }
  if (!deviceId || typeof deviceId !== "string") {
    return jsonMessage("deviceId required");
  }

  // Normalise the same way the dictionary is stored (accent-stripped, final
  // sigma collapsed) so "καλός"/"καλος"/"καλοσ" all resolve to one word — this
  // is what makes the duplicate/pending lookup actually collapse variants.
  const normalised = normalizeLetters(word).trim();

  if (!normalised) {
    return jsonMessage("word required");
  }

  // Reject proposals to ADD a blocklisted word (proper noun / month / place /
  // foreign word). Authoritative guard — the client warns first, but never
  // trust the client. Removal reports are unaffected.
  if (direction === "add" && isBlockedWord(normalised)) {
    return jsonMessage("blocked_word", 422);
  }

  const supabase = getSupabaseClient();

  const { error } = await table(supabase, "nominations").insert({
    word:        normalised,
    direction,
    player_name: playerName ?? null,
    note:        note ?? null,
    device_id:   deviceId,
    status:      "pending",
  });

  if (error) {
    // 23505 from the partial unique index on pending (word, direction): an
    // identical proposal is already in the queue — a concurrent submit from
    // another tab/device that the client-side lookup couldn't see. Hand back
    // the existing row's id so the client can offer "upvote it instead",
    // the same pivot the lookup path drives.
    if ((error as { code?: string }).code === "23505") {
      const { data: pending } = await table(supabase, "nominations")
        .select("id")
        .eq("word", normalised)
        .eq("direction", direction)
        .eq("status", "pending")
        .maybeSingle() as { data: { id: string } | null };

      return NextResponse.json(
        { error: "already_pending", pendingId: pending?.id ?? null },
        { status: 409 },
      );
    }
    return jsonError("db_error", error.message);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
