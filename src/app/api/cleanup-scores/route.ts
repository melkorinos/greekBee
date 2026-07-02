// GET /api/cleanup-scores — deletes game_scores, game_state, and transfer_codes rows older than SCORE_RETENTION_DAYS days.
// Invoked daily by Vercel Cron (see vercel.json). Auth via CRON_SECRET env var,
// which Vercel injects automatically in production.
// Uses the Supabase service role key to bypass RLS on DELETE.

import { NextRequest, NextResponse } from "next/server";

import { LEADERBOARD_WINDOW_DAYS, NOMINATION_APPLIED_RETENTION_DAYS, SCORE_RETENTION_DAYS } from "@/config/retention";
import { getServiceRoleClient } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get("Authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (SCORE_RETENTION_DAYS <= LEADERBOARD_WINDOW_DAYS) {
    return NextResponse.json(
      { error: `SCORE_RETENTION_DAYS (${SCORE_RETENTION_DAYS}) must exceed LEADERBOARD_WINDOW_DAYS (${LEADERBOARD_WINDOW_DAYS})` },
      { status: 500 },
    );
  }

  const scoreCutoff = new Date();
  scoreCutoff.setDate(scoreCutoff.getDate() - SCORE_RETENTION_DAYS);
  const cutoffStr = scoreCutoff.toISOString().split("T")[0];

  const nominationCutoff = new Date();
  nominationCutoff.setDate(nominationCutoff.getDate() - NOMINATION_APPLIED_RETENTION_DAYS);
  const nominationCutoffStr = nominationCutoff.toISOString();

  const supabase = getServiceRoleClient();

  const [scoresResult, stateResult, transferCodesResult, nominationsResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("game_scores") as any).delete({ count: "exact" }).lt("puzzle_date", cutoffStr),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("game_state") as any).delete({ count: "exact" }).lt("puzzle_date", cutoffStr),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("transfer_codes") as any).delete({ count: "exact" }).lt("created_at", cutoffStr),
    // Delete accepted nominations that have been applied (reviewed_at set) and are older than 30 days.
    // Rejected and pending nominations are never deleted.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("nominations") as any).delete({ count: "exact" })
      .eq("status", "accepted")
      .not("reviewed_at", "is", null)
      .lt("reviewed_at", nominationCutoffStr),
  ]);

  if (scoresResult.error || stateResult.error || transferCodesResult.error || nominationsResult.error) {
    const msg = scoresResult.error?.message ?? stateResult.error?.message ?? transferCodesResult.error?.message ?? nominationsResult.error?.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    cutoff: scoreCutoff,
    deleted: {
      scores:         scoresResult.count        ?? 0,
      gameState:      stateResult.count         ?? 0,
      transferCodes:  transferCodesResult.count  ?? 0,
      nominations:    nominationsResult.count    ?? 0,
    },
  });
}
