// POST /api/nominations/[id]/vote — toggle an up or down vote for a nomination.
// Same voteType → undo. Opposite voteType → switch. No existing vote → insert.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";

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

  let body: VotePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { deviceId, voteType = "up" } = body;
  if (!deviceId || typeof deviceId !== "string") {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }
  if (voteType !== "up" && voteType !== "down") {
    return NextResponse.json({ error: "voteType must be 'up' or 'down'" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Check for an existing vote from this device on this nomination.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from("nomination_votes") as any)
    .select("id, vote_type")
    .eq("nomination_id", id)
    .eq("device_id",     deviceId)
    .maybeSingle() as { data: { id: string; vote_type: string } | null };

  if (existing) {
    if (existing.vote_type === voteType) {
      // Same type — undo the vote.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("nomination_votes") as any).delete().eq("id", existing.id);
      return NextResponse.json({ ok: true, action: "removed" });
    } else {
      // Opposite type — switch the vote.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("nomination_votes") as any)
        .update({ vote_type: voteType })
        .eq("id", existing.id);
      return NextResponse.json({ ok: true, action: "switched" });
    }
  }

  // No existing vote — insert.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("nomination_votes") as any).insert({
    nomination_id: id,
    device_id:     deviceId,
    vote_type:     voteType,
  });

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: "added" }, { status: 201 });
}
