// cleanupScoresLiveDb.test.ts — integration test against the real Supabase database.
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
// Skipped automatically when those vars are absent (e.g. CI without production secrets).
//
// EXPECTED TO FAIL until the daily /api/cleanup-scores cron has run in production and
// pruned rows older than SCORE_RETENTION_DAYS days. Re-run after the first cron execution
// to confirm the job is working correctly.

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { SCORE_RETENTION_DAYS } from "@/config/retention";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && key);

function cutoffDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - SCORE_RETENTION_DAYS);
  return d.toISOString().split("T")[0];
}

describe.skipIf(!canRun)("live DB — no rows older than retention window", () => {
  it(`game_scores has no rows with puzzle_date older than ${SCORE_RETENTION_DAYS} days`, async () => {
    const supabase = createClient(url!, key!, { auth: { persistSession: false } });
    const cutoff = cutoffDateStr();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase.from("game_scores") as any)
      .select("puzzle_date", { count: "exact", head: true })
      .lt("puzzle_date", cutoff);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it(`game_state has no rows with puzzle_date older than ${SCORE_RETENTION_DAYS} days`, async () => {
    const supabase = createClient(url!, key!, { auth: { persistSession: false } });
    const cutoff = cutoffDateStr();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase.from("game_state") as any)
      .select("puzzle_date", { count: "exact", head: true })
      .lt("puzzle_date", cutoff);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});
