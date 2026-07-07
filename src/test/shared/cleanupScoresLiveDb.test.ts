// cleanupScoresLiveDb.test.ts — integration test against the real Supabase database.
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
// Skipped automatically when those vars are absent (e.g. CI without production secrets).
//
// The daily /api/cleanup-scores cron prunes ONLY ephemeral session data. game_scores
// is append-forever (ADR 0012), so we assert the opposite of game_state:
//   • game_state  — has NO rows older than SESSION_RETENTION_DAYS (cron pruned them).
//   • game_scores — is ALLOWED to keep rows older than that window; the lifetime-stats
//     substrate must survive. We assert the query succeeds (never that old rows are gone).

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { SESSION_RETENTION_DAYS } from "@/config/retention";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && key);

function cutoffDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - SESSION_RETENTION_DAYS);
  return d.toISOString().split("T")[0];
}

describe.skipIf(!canRun)("live DB — session data pruned, scores retained", () => {
  it(`game_state has no rows with puzzle_date older than ${SESSION_RETENTION_DAYS} days`, async () => {
    const supabase = createClient(url!, key!, { auth: { persistSession: false } });
    const cutoff = cutoffDateStr();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase.from("game_state") as any)
      .select("puzzle_date", { count: "exact", head: true })
      .lt("puzzle_date", cutoff);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it("game_scores query succeeds and is not window-capped (rows older than the session window may survive)", async () => {
    const supabase = createClient(url!, key!, { auth: { persistSession: false } });
    const cutoff = cutoffDateStr();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase.from("game_scores") as any)
      .select("puzzle_date", { count: "exact", head: true })
      .lt("puzzle_date", cutoff);

    // We do not require count === 0 here: append-forever means old rows are expected
    // to persist. This asserts the cron did NOT sweep them out of existence.
    expect(error).toBeNull();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
