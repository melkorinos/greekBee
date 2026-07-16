// GET /api/nominations/lookup?word=X&direction=add|remove
//
// Drives the re-proposal warning in NominationModal. Returns how many times this
// exact word (matched the same way POST stores it — lowercase + trim, same
// direction) was previously rejected, and how many are currently pending.
//
// `rejected > 0` → the player is re-proposing something an admin already declined;
// the UI warns and makes the explanation note mandatory.
// `accepted > 0` → an admin already approved this word; it's just waiting for the
// apply-nominations release, so it isn't in the dictionary yet. The UI tells the
// player it's already approved and blocks a pointless duplicate.
// `pending  > 0` → an identical proposal is already in the queue; the UI nudges
// the player to go vote for it instead of duplicating.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import { isBlockedWord } from "@/lib/nominationBlocklist";
import { normalizeLetters } from "@/lib/normalize";

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

  // Match the dictionary's storage form (accent-stripped, final sigma collapsed)
  // so variants of the same word collapse to one lookup key.
  const normalised = normalizeLetters(word).trim();

  // A blocklisted add-word (proper noun / month / place / foreign word) is
  // refused outright — the client shows a "not accepted" banner and disables
  // submit, so there's no point querying the pending/rejected/accepted counts.
  if (direction === "add" && isBlockedWord(normalised)) {
    return NextResponse.json({
      word:      normalised,
      direction,
      blocked:   true,
      rejected:  0,
      accepted:  0,
      pending:   0,
      pendingId: null,
    });
  }

  const supabase   = getSupabaseClient();

  // Rejected: head-only count — no rows transferred, just the total.
  const rejectedQuery =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("nominations") as any)
      .select("id", { count: "exact", head: true })
      .eq("word", normalised)
      .eq("direction", direction)
      .eq("status", "rejected");

  // Accepted: approved but not yet released (apply-nominations hasn't run), so the
  // word is not in the dictionary yet. Head-only count is enough.
  const acceptedQuery =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("nominations") as any)
      .select("id", { count: "exact", head: true })
      .eq("word", normalised)
      .eq("direction", direction)
      .eq("status", "accepted");

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

  const [rejectedRes, acceptedRes, pendingRes] = await Promise.all([
    rejectedQuery, acceptedQuery, pendingQuery,
  ]) as [
    { count: number | null; error: unknown },
    { count: number | null; error: unknown },
    { data: Array<{ id: string }> | null; count: number | null; error: unknown },
  ];

  if (rejectedRes.error || acceptedRes.error || pendingRes.error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({
    word:      normalised,
    direction,
    blocked:   false,
    rejected:  rejectedRes.count ?? 0,
    accepted:  acceptedRes.count ?? 0,
    pending:   pendingRes.count ?? 0,
    pendingId: pendingRes.data?.[0]?.id ?? null,
  });
}
