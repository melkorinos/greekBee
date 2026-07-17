// POST /api/nominations/[id]/vote — toggle an up or down vote for a nomination.
// Same voteType → undo. Opposite voteType → switch. No existing vote → insert.

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getSupabaseClient, table } from "@/lib/supabase";

export const runtime = "edge";

interface VotePayload {
  deviceId:  string;
  voteType?: "up" | "down";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const parsed = await parseJson<VotePayload>(req);
  if (!parsed.ok) return parsed.response;

  const { deviceId, voteType = "up" } = parsed.body;
  if (!deviceId || typeof deviceId !== "string") {
    return jsonMessage("deviceId required");
  }
  if (voteType !== "up" && voteType !== "down") {
    return jsonMessage("voteType must be 'up' or 'down'");
  }

  const supabase = getSupabaseClient();

  // Check for an existing vote from this device on this nomination. A lookup
  // failure must short-circuit — falling through to insert on error is what
  // used to compound duplicates once two rows existed for the pair.
  const { data: existing, error: lookupErr } = await table(supabase, "nomination_votes")
    .select("id, vote_type")
    .eq("nomination_id", id)
    .eq("device_id",     deviceId)
    .maybeSingle() as { data: { id: string; vote_type: string } | null; error: { message: string } | null };

  if (lookupErr) {
    return jsonError("db_error", lookupErr.message);
  }

  if (existing) {
    if (existing.vote_type === voteType) {
      // Same type — undo the vote.
      await table(supabase, "nomination_votes").delete().eq("id", existing.id);
      return NextResponse.json({ ok: true, action: "removed" });
    } else {
      // Opposite type — switch the vote.
      await table(supabase, "nomination_votes")
        .update({ vote_type: voteType })
        .eq("id", existing.id);
      return NextResponse.json({ ok: true, action: "switched" });
    }
  }

  // No existing vote — insert.
  const { error } = await table(supabase, "nomination_votes").insert({
    nomination_id: id,
    device_id:     deviceId,
    vote_type:     voteType,
  });

  if (error) {
    // 23505: a concurrent request from this device won the insert race
    // (UNIQUE (nomination_id, device_id) backstop). The vote exists — resolve
    // against it instead of answering 500.
    if ((error as { code?: string }).code === "23505") {
      const { data: raced } = await table(supabase, "nomination_votes")
        .select("id, vote_type")
        .eq("nomination_id", id)
        .eq("device_id",     deviceId)
        .maybeSingle() as { data: { id: string; vote_type: string } | null };

      if (raced) {
        if (raced.vote_type === voteType) {
          return NextResponse.json({ ok: true, action: "added" }, { status: 201 });
        }
        await table(supabase, "nomination_votes")
          .update({ vote_type: voteType })
          .eq("id", raced.id);
        return NextResponse.json({ ok: true, action: "switched" });
      }
    }
    return jsonError("db_error", error.message);
  }

  return NextResponse.json({ ok: true, action: "added" }, { status: 201 });
}
