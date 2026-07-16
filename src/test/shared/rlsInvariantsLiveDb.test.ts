// rlsInvariantsLiveDb.test.ts — integration test of the RLS posture of the tables
// whose access matrix is load-bearing, against the real Supabase database.
//
// Why this exists: RLS policies are invisible to mocked unit tests — only a live
// check can prove that the anon role (the public key shipped to every browser)
// has exactly the access we intend. This test locks in the leaderboard table's
// access matrix so a future policy change (or a bad migration) can't silently
// re-open deletes or break inserts/reads.
//
// Asserted invariants for `public.community_stavrolekso_puzzles` are at the foot of
// the file. For `public.game_scores`:
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
import { table } from "@/lib/supabase";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

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
    await table(service, "game_scores").delete().eq("game_id", GAME_ID);
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

    const { error } = await table(anon, "game_scores").insert(scoreRow(device_id));
    expect(error).toBeNull();

    // Confirm it actually persisted (read back with the service role).
    const { count } = await table(service, "game_scores")
      .select("id", { count: "exact", head: true })
      .eq("game_id", GAME_ID)
      .eq("device_id", device_id);
    expect(count).toBe(1);
  });

  it("allows anon to SELECT scores", async () => {
    const device_id = freshDeviceId();
    await table(service, "game_scores").insert(scoreRow(device_id, 5));

    const { data, error } = await table(anon, "game_scores")
      .select("device_id, score")
      .eq("game_id", GAME_ID)
      .eq("device_id", device_id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect((data as { score: number }[])[0].score).toBe(5);
  });

  it("blocks anon from DELETE-ing a score", async () => {
    const device_id = freshDeviceId();
    await table(service, "game_scores").insert(scoreRow(device_id));

    // anon delete: with no DELETE policy, RLS matches zero rows (no error, no effect).
    await table(anon, "game_scores").delete().eq("device_id", device_id);

    // The row must still be there.
    const { count } = await table(service, "game_scores")
      .select("id", { count: "exact", head: true })
      .eq("game_id", GAME_ID)
      .eq("device_id", device_id);
    expect(count).toBe(1);
  });

  it("enforces the (game_id, device_id, puzzle_date) uniqueness constraint", async () => {
    const device_id = freshDeviceId();
    const first = await table(service, "game_scores").insert(scoreRow(device_id));
    expect(first.error).toBeNull();

    // A second raw insert for the same triplet must violate the unique constraint.
    const second = await table(anon, "game_scores").insert(scoreRow(device_id, 99));
    expect(second.error).not.toBeNull();
  });
});

// ── transfer_codes ────────────────────────────────────────────────────────────
//
// Server-only table (migration 20260716120000): a transfer code maps to a
// device_uuid — the platform's de-facto bearer credential — so anon must have
// NO access at all. Both /api/transfer routes use the service-role client.
// The trap this locks down: anon SELECT with no policy is not an error, it
// just returns zero rows — so only a sentinel row proves the denial is real.

describe.skipIf(!canRun)("live DB — transfer_codes RLS invariants", () => {
  let anon:    SupabaseClient;
  let service: SupabaseClient;

  const SENTINEL_CODE = "RLSTST";

  async function wipeSentinelRows() {
    await table(service, "transfer_codes").delete().eq("code", SENTINEL_CODE);
  }

  beforeAll(async () => {
    anon    = createClient(url!, anonKey!,    { auth: { persistSession: false } });
    service = createClient(url!, serviceKey!, { auth: { persistSession: false } });
    await wipeSentinelRows();
    const { error } = await table(service, "transfer_codes").insert({
      code:        SENTINEL_CODE,
      device_uuid: `__rls_${crypto.randomUUID()}`,
      expires_at:  new Date(Date.now() + 60_000).toISOString(),
    });
    expect(error).toBeNull();
  });

  afterAll(async () => {
    await wipeSentinelRows();
  });

  it("blocks anon from SELECT-ing transfer codes (zero rows despite the sentinel)", async () => {
    const { data, error } = await table(anon, "transfer_codes").select("code, device_uuid");
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("blocks anon from INSERT-ing a transfer code", async () => {
    const { error } = await table(anon, "transfer_codes").insert({
      code:        "RLSTS2",
      device_uuid: "attacker-chosen",
      expires_at:  new Date(Date.now() + 60_000).toISOString(),
    });
    expect(error).not.toBeNull();
  });
});

// ── community_stavrolekso_puzzles ─────────────────────────────────────────────
//
// The creator-edit flow (ADR 0005) authorises with a server-side PIN check, which
// RLS cannot see — so anon deliberately has no UPDATE policy and the route writes
// with the service role. This locks that posture down from both ends, because the
// failure mode is silent: an anon UPDATE with no policy is not an error, it just
// matches zero rows, which is how the edit route came to answer ok:true while
// discarding the edit.
//
// Safety: rows carry a sentinel title, and the service role wipes them either side.

const SENTINEL_TITLE = "__rls_test__";

describe.skipIf(!canRun)("live DB — community_stavrolekso_puzzles RLS invariants", () => {
  let anon:    SupabaseClient;
  let service: SupabaseClient;
  let rowId:   number;

  async function wipeSentinelRows() {
    await table(service, "community_stavrolekso_puzzles").delete().eq("title", SENTINEL_TITLE);
  }

  beforeAll(async () => {
    anon    = createClient(url!, anonKey!,    { auth: { persistSession: false } });
    service = createClient(url!, serviceKey!, { auth: { persistSession: false } });
    await wipeSentinelRows();
  });

  afterAll(async () => {
    await wipeSentinelRows();
  });

  beforeEach(async () => {
    await wipeSentinelRows();
    const { data, error } = await table(service, "community_stavrolekso_puzzles")
      .insert({
        title:          SENTINEL_TITLE,
        submitter_name: "rls-test",
        edit_pin:       "0000",
        status:         "pending",
        data:           { slots: [] },
      } as never)
      .select("id")
      .single();
    expect(error).toBeNull();
    rowId = (data as { id: number }).id;
  });

  it("blocks anon from UPDATE-ing a pending puzzle", async () => {
    // No UPDATE policy → zero rows matched, and (the trap) no error.
    await table(anon, "community_stavrolekso_puzzles")
      .update({ title: "hijacked" } as never)
      .eq("id", rowId);

    const { data } = await table(service, "community_stavrolekso_puzzles")
      .select("title")
      .eq("id", rowId)
      .single();
    expect((data as { title: string }).title).toBe(SENTINEL_TITLE);
  });

  it("allows the service role to UPDATE a pending puzzle (the edit route's path)", async () => {
    const { data, error } = await table(service, "community_stavrolekso_puzzles")
      .update({ submitter_name: "edited" } as never)
      .eq("id", rowId)
      .select("id");

    expect(error).toBeNull();
    // The route reads this same non-empty result as proof the edit landed.
    expect(data).toHaveLength(1);
  });
});
