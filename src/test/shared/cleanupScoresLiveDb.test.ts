// cleanupScoresLiveDb.test.ts — integration test of the retention cron against the
// real Supabase database. Requires NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY (loaded from .env.local by vitest.config.ts).
// Auto-skips when those are absent (e.g. CI without production secrets).
//
// What this asserts, and why it changed shape (issue 03, 2026-07-17):
//
// This suite used to assert ambient DB state — "game_state has NO rows with
// puzzle_date older than SESSION_RETENTION_DAYS". That invariant is false, and the
// suite had never actually run (nothing loaded .env.local into vitest), so nobody
// knew. Past-puzzle play is a supported feature (the rolling leaderboard strip,
// useDayChange's past-puzzle nav) and game_state.puzzle_date is the *puzzle's* date,
// not the play date — so playing an old puzzle writes a row that is already outside
// the retention window, and it survives until the next 03:00 prune. The old
// assertion only held in the gap between the cron running and the day's first
// past-puzzle play; it failed the moment it was first switched on, against a real
// player's row.
//
// So we assert the cron's *effect on rows we seeded ourselves* instead: the
// mechanism, not the ambient state. That is what the cron actually promises, and it
// is immune to whatever live players are doing while the suite runs.
//
//   • game_state  — a seeded row older than the window IS pruned.
//   • game_state  — a seeded row inside the window is NOT pruned (the prune is a
//                   cutoff, not a table wipe).
//   • game_scores — a seeded row older than the window SURVIVES. It is the
//                   append-forever lifetime-stats substrate (ADR 0012); pruning it
//                   would silently corrupt Lifetime Stats and streaks.
//
// ⚠ This suite invokes the real cron handler against the real database, so it prunes
// production game_state exactly as the nightly 03:00 run does. That blast radius is
// bounded to rows SESSION_RETENTION_DAYS has already condemned — the cron would
// delete them within the day regardless — but it is a real write, not a dry run.
//
// Safety: every row this suite creates carries a sentinel game_id / device_uuid that
// no real query reads, and the service role wipes them either side of the run.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_RETENTION_DAYS } from "@/config/retention";
import { table } from "@/lib/supabase";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && key);

// The cron authenticates on CRON_SECRET, which Vercel injects in production and
// which is not in .env.local. We own both ends here, so stub it and present it.
const TEST_CRON_SECRET = "__cleanup_livedb_secret__";
vi.stubEnv("CRON_SECRET", TEST_CRON_SECRET);

// Sentinel values — invisible to every real query, wiped either side of the run.
const GAME_ID = "__cleanup_test__";
const DEVICE_PREFIX = "__cleanup_";

/** A date `offset` days before today, as YYYY-MM-DD — the shape puzzle_date stores. */
function dateStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().split("T")[0];
}

// Comfortably outside the window vs comfortably inside it, both derived from the
// config rather than hardcoded, so retuning SESSION_RETENTION_DAYS retunes the test.
const STALE_DATE = dateStr(SESSION_RETENTION_DAYS + 5);
const FRESH_DATE = dateStr(0);

function freshDeviceId(): string {
  return `${DEVICE_PREFIX}${crypto.randomUUID()}`;
}

describe.skipIf(!canRun)("live DB — the retention cron's effect on seeded rows", () => {
  let service: SupabaseClient;

  async function wipeSentinelRows() {
    await table(service, "game_state").delete().like("device_uuid", `${DEVICE_PREFIX}%`);
    await table(service, "game_scores").delete().eq("game_id", GAME_ID);
  }

  /** Invokes the real cron handler, as Vercel Cron does. */
  async function runPrune(): Promise<Response> {
    const { GET } = await import("@/app/api/cleanup-scores/route");
    return GET(
      new NextRequest("http://localhost/api/cleanup-scores", {
        headers: { Authorization: `Bearer ${TEST_CRON_SECRET}` },
      }),
    );
  }

  async function countGameState(device_uuid: string): Promise<number | null> {
    const { count } = await table(service, "game_state")
      .select("id", { count: "exact", head: true })
      .eq("device_uuid", device_uuid);
    return count;
  }

  beforeAll(async () => {
    service = createClient(url!, key!, { auth: { persistSession: false } });
    await wipeSentinelRows();
  });

  afterAll(async () => {
    await wipeSentinelRows();
  });

  beforeEach(async () => {
    await wipeSentinelRows();
  });

  it(`prunes a game_state row older than ${SESSION_RETENTION_DAYS} days`, async () => {
    const device_uuid = freshDeviceId();
    const { error: seedErr } = await table(service, "game_state")
      .insert({ device_uuid, game_id: GAME_ID, puzzle_date: STALE_DATE, state: {} });
    expect(seedErr).toBeNull();
    expect(await countGameState(device_uuid)).toBe(1);

    const res = await runPrune();
    expect(res.status).toBe(200);

    expect(await countGameState(device_uuid)).toBe(0);
  });

  it(`leaves a game_state row inside the ${SESSION_RETENTION_DAYS}-day window alone`, async () => {
    // The other half of the cutoff: proves the prune is bounded, not a table wipe.
    const device_uuid = freshDeviceId();
    const { error: seedErr } = await table(service, "game_state")
      .insert({ device_uuid, game_id: GAME_ID, puzzle_date: FRESH_DATE, state: {} });
    expect(seedErr).toBeNull();

    const res = await runPrune();
    expect(res.status).toBe(200);

    expect(await countGameState(device_uuid)).toBe(1);
  });

  it("never prunes a game_scores row, however old (append-forever, ADR 0012)", async () => {
    // game_scores is the lifetime-stats substrate: a row well outside the session
    // window must survive the same prune that just deleted its game_state twin.
    const device_id = freshDeviceId();
    const { error: seedErr } = await table(service, "game_scores").insert({
      game_id: GAME_ID,
      puzzle_date: STALE_DATE,
      device_id,
      display_name: "cleanup-test",
      score: 1,
    });
    expect(seedErr).toBeNull();

    const res = await runPrune();
    expect(res.status).toBe(200);

    const { count } = await table(service, "game_scores")
      .select("id", { count: "exact", head: true })
      .eq("game_id", GAME_ID)
      .eq("device_id", device_id);
    expect(count).toBe(1);
  });
});
