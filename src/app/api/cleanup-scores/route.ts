// GET /api/cleanup-scores — prunes ephemeral session data: game_state and
// transfer_codes rows older than SESSION_RETENTION_DAYS days, plus accepted+applied
// nominations older than NOMINATION_APPLIED_RETENTION_DAYS days.
//
// game_scores is NEVER pruned here: it is the append-forever lifetime-stats substrate
// (ADR 0012 / issue 03). The route name is legacy — kept to avoid churning the
// vercel.json cron path.
//
// Invoked daily by Vercel Cron (see vercel.json). Auth via CRON_SECRET env var,
// which Vercel injects automatically in production.
// Uses the Supabase service role key to bypass RLS on DELETE.
//
// Deliberately outside the route envelope's jsonError discipline (ADR 0016):
// this route has exactly one caller — Vercel Cron, behind CRON_SECRET — so the
// raw Postgres message below reaches an operator's log, not a player. That makes
// it a diagnostic rather than a leak, and it is the only trace of a failed
// nightly prune. Do not "seal" it. Its auth is CRON_SECRET, not ADMIN_SECRET, so
// requireAdmin does not apply either.

import { NextRequest, NextResponse } from "next/server";

import { NOMINATION_APPLIED_RETENTION_DAYS, SESSION_RETENTION_DAYS } from "@/config/retention";
import { getServiceRoleClient, table } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get("Authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionCutoff = new Date();
  sessionCutoff.setDate(sessionCutoff.getDate() - SESSION_RETENTION_DAYS);
  const cutoffStr = sessionCutoff.toISOString().split("T")[0];

  const nominationCutoff = new Date();
  nominationCutoff.setDate(nominationCutoff.getDate() - NOMINATION_APPLIED_RETENTION_DAYS);
  const nominationCutoffStr = nominationCutoff.toISOString();

  const supabase = getServiceRoleClient();

  const [stateResult, transferCodesResult, nominationsResult] = await Promise.all([
    table(supabase, "game_state").delete({ count: "exact" }).lt("puzzle_date", cutoffStr),
    table(supabase, "transfer_codes").delete({ count: "exact" }).lt("created_at", cutoffStr),
    // Delete accepted nominations that have been applied (reviewed_at set) and are older than 30 days.
    // Rejected and pending nominations are never deleted.
    table(supabase, "nominations").delete({ count: "exact" })
      .eq("status", "accepted")
      .not("reviewed_at", "is", null)
      .lt("reviewed_at", nominationCutoffStr),
  ]);

  if (stateResult.error || transferCodesResult.error || nominationsResult.error) {
    const msg = stateResult.error?.message ?? transferCodesResult.error?.message ?? nominationsResult.error?.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    cutoff: sessionCutoff,
    deleted: {
      gameState:      stateResult.count         ?? 0,
      transferCodes:  transferCodesResult.count  ?? 0,
      nominations:    nominationsResult.count    ?? 0,
    },
  });
}
