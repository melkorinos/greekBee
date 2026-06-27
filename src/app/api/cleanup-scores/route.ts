// GET /api/cleanup-scores — deletes game_scores and game_state rows older than SCORE_RETENTION_DAYS days.
// Invoked daily by Vercel Cron (see vercel.json). Auth via CRON_SECRET env var,
// which Vercel injects automatically in production.
// Uses the Supabase service role key to bypass RLS on DELETE.

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { SCORE_RETENTION_DAYS } from "@/config/retention";

export const runtime = "edge";

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get("Authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SCORE_RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const supabase = getServiceRoleClient();

  const [scoresResult, stateResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("game_scores") as any).delete({ count: "exact" }).lt("puzzle_date", cutoffStr),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("game_state") as any).delete({ count: "exact" }).lt("puzzle_date", cutoffStr),
  ]);

  if (scoresResult.error || stateResult.error) {
    const msg = scoresResult.error?.message ?? stateResult.error?.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    cutoff,
    deleted: {
      scores:    scoresResult.count ?? 0,
      gameState: stateResult.count  ?? 0,
    },
  });
}
