// GET /api/nominations/lookup?word=X&direction=add|remove
//
// Drives the re-proposal warning in NominationModal. Returns how many times this
// exact word (matched the same way POST stores it — lowercase + trim, same
// direction) was previously rejected, and how many are currently pending.
//
// `rejected > 0` → the player is re-proposing something an admin already declined;
// the UI warns and makes the explanation note mandatory.
// `pending  > 0` → an identical proposal is already in the queue; the UI nudges
// the player to go vote for it instead of duplicating.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const word      = req.nextUrl.searchParams.get("word");
  const direction = req.nextUrl.searchParams.get("direction");

  if (!word || !word.trim()) {
    return NextResponse.json({ error: "word required" }, { status: 400 });
  }
  if (direction !== "add" && direction !== "remove") {
    return NextResponse.json({ error: "direction must be 'add' or 'remove'" }, { status: 400 });
  }

  const normalised = word.toLowerCase().trim();
  const supabase   = getSupabaseClient();

  // Rejected: head-only count — no rows transferred, just the total.
  const rejectedQuery =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("nominations") as any)
      .select("id", { count: "exact", head: true })
      .eq("word", normalised)
      .eq("direction", direction)
      .eq("status", "rejected");

  // Pending: fetch the ids (earliest first) so the client can offer to upvote the
  // existing proposal instead of inserting a duplicate. `pendingId` = the original.
  const pendingQuery =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("nominations") as any)
      .select("id", { count: "exact" })
      .eq("word", normalised)
      .eq("direction", direction)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

  const [rejectedRes, pendingRes] = await Promise.all([rejectedQuery, pendingQuery]) as [
    { count: number | null; error: unknown },
    { data: Array<{ id: string }> | null; count: number | null; error: unknown },
  ];

  if (rejectedRes.error || pendingRes.error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({
    word:      normalised,
    direction,
    rejected:  rejectedRes.count ?? 0,
    pending:   pendingRes.count ?? 0,
    pendingId: pendingRes.data?.[0]?.id ?? null,
  });
}
