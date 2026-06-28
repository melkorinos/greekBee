// rlsInvariantsLiveDb.test.ts — integration test of the game_scores RLS posture
// against the real Supabase database.
//
// Why this exists: RLS policies are invisible to mocked unit tests — only a live
// check can prove that the anon role (the public key shipped to every browser)
// has exactly the access we intend. This test locks in the leaderboard table's
// access matrix so a future policy change (or a bad migration) can't silently
// re-open deletes or break inserts/reads.
//
// Asserted invariants for `public.game_scores`:
//   1. anon CAN insert a score          (leaderboard writes work)
//   2. anon CAN read scores             (leaderboard reads work)
//   3. anon CANNOT delete a score       (the DELETE lockdown holds)
//   4. (game_id, device_id, puzzle_date) is unique (no duplicate leaderboard rows)
//
// Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY in .env.local. Auto-skips when absent (e.g. CI).
//
// Safety: all rows use a sentinel game_id that no real leaderboard query reads,
// and an ancient puzzle_date that the retention cron prunes anyway. The service
// role wipes every sentinel row before and after the run.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun     = Boolean(url && anonKey && serviceKey);

// Sentinel values — invisible to real leaderboards, pruned by the retention cron.
const GAME_ID     = "__rls_test__";
const PUZZLE_DATE = "2000-01-01";

function freshDeviceId(): string {
  return `__rls_${crypto.randomUUID()}`;
}

function scoreRow(device_id: string, score = 1) {
  return { game_id: GAME_ID, puzzle_date: PUZZLE_DATE, device_id, display_name: "rls-test", score };
}

describe.skipIf(!canRun)("live DB — game_scores RLS invariants", () => {
  let anon:    SupabaseClient;
  let service: SupabaseClient;

  async function wipeSentinelRows() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service.from("game_scores") as any).delete().eq("game_id", GAME_ID);
  }

  beforeAll(async () => {
    anon    = createClient(url!, anonKey!,    { auth: { persistSession: false } });
    service = createClient(url!, serviceKey!, { auth: { persistSession: false } });
    await wipeSentinelRows();
  });

  afterAll(async () => {
    await wipeSentinelRows();
  });

  it("allows anon to INSERT a score", async () => {
    const device_id = freshDeviceId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (anon.from("game_scores") as any).insert(scoreRow(device_id));
    expect(error).toBeNull();

    // Confirm it actually persisted (read back with the service role).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (service.from("game_scores") as any)
      .select("id", { count: "exact", head: true })
      .eq("game_id", GAME_ID)
      .eq("device_id", device_id);
    expect(count).toBe(1);
  });

  it("allows anon to SELECT scores", async () => {
    const device_id = freshDeviceId();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service.from("game_scores") as any).insert(scoreRow(device_id, 5));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (anon.from("game_scores") as any)
      .select("device_id, score")
      .eq("game_id", GAME_ID)
      .eq("device_id", device_id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect((data as { score: number }[])[0].score).toBe(5);
  });

  it("blocks anon from DELETE-ing a score", async () => {
    const device_id = freshDeviceId();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service.from("game_scores") as any).insert(scoreRow(device_id));

    // anon delete: with no DELETE policy, RLS matches zero rows (no error, no effect).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (anon.from("game_scores") as any).delete().eq("device_id", device_id);

    // The row must still be there.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (service.from("game_scores") as any)
      .select("id", { count: "exact", head: true })
      .eq("game_id", GAME_ID)
      .eq("device_id", device_id);
    expect(count).toBe(1);
  });

  it("enforces the (game_id, device_id, puzzle_date) uniqueness constraint", async () => {
    const device_id = freshDeviceId();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = await (service.from("game_scores") as any).insert(scoreRow(device_id));
    expect(first.error).toBeNull();

    // A second raw insert for the same triplet must violate the unique constraint.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const second = await (anon.from("game_scores") as any).insert(scoreRow(device_id, 99));
    expect(second.error).not.toBeNull();
  });
});
