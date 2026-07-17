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
import { normalizeLetters } from "@/lib/normalize";
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

// ── player_achievements / player_pangrams / game_state ───────────────────────
//
// Migration 20260716120100 narrowed the anon ALL-true policies to the commands
// the app uses: SELECT+INSERT on the two ADR 0013 fact tables, SELECT+INSERT+
// UPDATE on game_state. The invariant locked here is the removal: anon DELETE
// matches zero rows table-wide (silently — no error), and the game_state
// upsert (the restore path) still works.

describe.skipIf(!canRun)("live DB — narrowed anon policies (achievements/pangrams/game_state)", () => {
  let anon:    SupabaseClient;
  let service: SupabaseClient;

  const DEVICE = `__rls_${crypto.randomUUID()}`;

  async function wipeSentinelRows() {
    await table(service, "player_achievements").delete().like("device_uuid", "__rls_%");
    await table(service, "player_pangrams").delete().like("device_uuid", "__rls_%");
    await table(service, "game_state").delete().like("device_uuid", "__rls_%");
  }

  beforeAll(async () => {
    anon    = createClient(url!, anonKey!,    { auth: { persistSession: false } });
    service = createClient(url!, serviceKey!, { auth: { persistSession: false } });
    await wipeSentinelRows();
  });

  afterAll(async () => {
    await wipeSentinelRows();
  });

  it("blocks anon from DELETE-ing player_achievements rows", async () => {
    const { error: seedErr } = await table(service, "player_achievements")
      .insert({ device_uuid: DEVICE, achievement_id: "__rls_test__" });
    expect(seedErr).toBeNull();

    await table(anon, "player_achievements").delete().eq("device_uuid", DEVICE);

    const { count } = await table(service, "player_achievements")
      .select("id", { count: "exact", head: true })
      .eq("device_uuid", DEVICE);
    expect(count).toBe(1);
  });

  it("blocks anon from DELETE-ing player_pangrams rows", async () => {
    const { error: seedErr } = await table(service, "player_pangrams")
      .insert({ device_uuid: DEVICE, puzzle_date: PUZZLE_DATE, word: "__rls_test__" });
    expect(seedErr).toBeNull();

    await table(anon, "player_pangrams").delete().eq("device_uuid", DEVICE);

    const { count } = await table(service, "player_pangrams")
      .select("id", { count: "exact", head: true })
      .eq("device_uuid", DEVICE);
    expect(count).toBe(1);
  });

  it("blocks anon from DELETE-ing game_state rows", async () => {
    const { error: seedErr } = await table(service, "game_state")
      .insert({ device_uuid: DEVICE, game_id: GAME_ID, puzzle_date: PUZZLE_DATE, state: {} });
    expect(seedErr).toBeNull();

    await table(anon, "game_state").delete().eq("device_uuid", DEVICE);

    const { count } = await table(service, "game_state")
      .select("id", { count: "exact", head: true })
      .eq("device_uuid", DEVICE);
    expect(count).toBe(1);
  });

  it("still allows the anon game_state upsert the restore path depends on", async () => {
    const device = `__rls_${crypto.randomUUID()}`;
    const base   = { device_uuid: device, game_id: GAME_ID, puzzle_date: PUZZLE_DATE };

    // Insert half of the upsert…
    const first = await table(anon, "game_state").upsert(
      { ...base, state: { step: 1 } },
      { onConflict: "device_uuid,game_id,puzzle_date" },
    );
    expect(first.error).toBeNull();

    // …and the update half, against the row that now exists.
    const second = await table(anon, "game_state").upsert(
      { ...base, state: { step: 2 } },
      { onConflict: "device_uuid,game_id,puzzle_date" },
    );
    expect(second.error).toBeNull();

    const { data } = await table(service, "game_state")
      .select("state")
      .eq("device_uuid", device)
      .single();
    expect((data as { state: { step: number } }).state.step).toBe(2);
  });

  it("still allows the anon insert-if-absent write on player_achievements", async () => {
    const device = `__rls_${crypto.randomUUID()}`;
    const row    = { device_uuid: device, achievement_id: "__rls_test__" };

    const first = await table(anon, "player_achievements").upsert(
      [row], { onConflict: "device_uuid,achievement_id", ignoreDuplicates: true },
    );
    expect(first.error).toBeNull();

    // Re-submitting the same fact is a no-op, not an error (DO NOTHING).
    const second = await table(anon, "player_achievements").upsert(
      [row], { onConflict: "device_uuid,achievement_id", ignoreDuplicates: true },
    );
    expect(second.error).toBeNull();
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

  it("blocks anon from SELECT-ing edit_pin", async () => {
    // RLS has no column-level filtering, so this is held by a column GRANT
    // (migration 20260717120000), not a policy. Asking for a column anon has no
    // privilege on is a hard 42501 from Postgres — unlike the RLS traps above,
    // this one does error rather than answer quietly.
    const { data, error } = await table(anon, "community_stavrolekso_puzzles")
      .select("id, edit_pin")
      .eq("id", rowId);

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("still allows anon to SELECT the public browse columns", async () => {
    // The other half of the grant: revoking edit_pin must not take the browse
    // path (landing page + /stavrolekso/[id]) down with it.
    const { data, error } = await table(anon, "community_stavrolekso_puzzles")
      .select("id, title, submitter_name, data, status, created_at")
      .eq("id", rowId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("blocks anon from SELECT-ing every column via *", async () => {
    // `select("*")` is the probe from the issue in its laziest form: with no
    // grant on edit_pin, the star expansion itself is refused.
    const { error } = await table(anon, "community_stavrolekso_puzzles").select("*").eq("id", rowId);
    expect(error).not.toBeNull();
  });

  it("still allows the anon submit path to INSERT a puzzle and read back its id", async () => {
    // The maker's submit path (createSubmitHandler, returnInsertedId) writes
    // edit_pin as anon and RETURNINGs the new id for the creator's edit URL.
    // INSERT is a separate privilege from SELECT, so revoking SELECT must not
    // touch it — but RETURNING id does need `id` to have survived in the grant.
    const { data, error } = await table(anon, "community_stavrolekso_puzzles")
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
    expect((data as { id: number }).id).toBeTypeOf("number");
  });

  it("blocks the anon submit path from RETURNING the edit_pin it just wrote", async () => {
    // Writing a column you cannot read is the intended asymmetry — otherwise
    // RETURNING would be a way back to the PIN.
    const { error } = await table(anon, "community_stavrolekso_puzzles")
      .insert({
        title:          SENTINEL_TITLE,
        submitter_name: "rls-test",
        edit_pin:       "0000",
        status:         "pending",
        data:           { slots: [] },
      } as never)
      .select("id, edit_pin")
      .single();

    expect(error).not.toBeNull();
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

// ── nominations / nomination_votes dedup backstops ────────────────────────────
//
// Migration 20260716120200 added the two DB objects that make the dedup promises
// real rather than best-effort:
//   nomination_votes_nomination_device_unique  UNIQUE (nomination_id, device_id)
//   nominations_pending_word_direction_key     UNIQUE (word, direction)
//                                              WHERE status = 'pending'
// Both were only ever "tested" by unit tests that *inject* `code: "23505"` into a
// mocked Supabase — which proves the route branches correctly given a violation,
// not that a violation ever occurs. Drop either object and the whole mocked suite
// stays green while duplicates silently return. Hence a live check, same argument
// as the blocks above.
//
// The partial predicate gets its own test on purpose: re-proposing a word after
// it was rejected is a deliberate feature (see the migration comment), so a
// non-partial index would break it — and nothing else in the suite would notice.
//
// These inserts use the service role throughout. RLS is not what is under test
// here (the blocks above own that); a unique index applies to every role alike,
// so bypassing RLS isolates the constraint as the only thing that can fail.
//
// Safety: every row carries a sentinel word / device prefixed `__rls_`, which no
// real query reads — the admin queue filters on status and the GET route reads
// real Greek words. The service role wipes them either side of the run.

// Normalised the same way route.ts stores every nomination word (accent-stripped,
// lowercased, final sigma collapsed). This matters: the index is built on the
// stored form, so a raw sentinel would exercise a different key than production.
const SENTINEL_WORD = normalizeLetters("__RLS_TEST_ΛΈΞΗΣ__");

describe.skipIf(!canRun)("live DB — nominations dedup backstops", () => {
  let service: SupabaseClient;

  function nominationRow(status: string, direction: "add" | "remove" = "add") {
    return {
      word:      SENTINEL_WORD,
      direction,
      device_id: `__rls_${crypto.randomUUID()}`,
      status,
    };
  }

  async function wipeSentinelRows() {
    // Votes first — nomination_votes.nomination_id is an FK onto nominations.
    await table(service, "nomination_votes").delete().like("device_id", "__rls_%");
    await table(service, "nominations").delete().like("word", "__rls_%");
  }

  /** Seeds one nomination and returns its id. */
  async function seedNomination(status: string, direction: "add" | "remove" = "add") {
    const { data, error } = await table(service, "nominations")
      .insert(nominationRow(status, direction))
      .select("id")
      .single();
    expect(error).toBeNull();
    return (data as { id: string }).id;
  }

  beforeAll(async () => {
    service = createClient(url!, serviceKey!, { auth: { persistSession: false } });
    await wipeSentinelRows();
  });

  afterAll(async () => {
    await wipeSentinelRows();
  });

  beforeEach(async () => {
    await wipeSentinelRows();
  });

  it("stores the sentinel word in its normalised form", async () => {
    // Guards the test itself: if normalizeLetters ever stopped collapsing the
    // final sigma / stripping the accent, every assertion below would still pass
    // while keying on a word production never writes.
    expect(SENTINEL_WORD).toBe("__rls_test_λεξησ__");
    // …and it is a fixed point: normalising the stored form again changes nothing.
    expect(SENTINEL_WORD).toBe(normalizeLetters(SENTINEL_WORD));
  });

  it("rejects a second PENDING nomination for the same (word, direction)", async () => {
    await seedNomination("pending");

    const second = await table(service, "nominations").insert(nominationRow("pending"));

    // 23505 specifically — that is the code route.ts:148 branches on to answer
    // 409 already_pending. Any other error would mean the 409 path is dead.
    expect(second.error).not.toBeNull();
    expect(second.error?.code).toBe("23505");
  });

  it("allows the same pending word in the other direction", async () => {
    // The index keys on the pair, not the word: proposing to ADD a word and
    // reporting it for REMOVAL are different rows and must coexist.
    await seedNomination("pending", "add");

    const { error } = await table(service, "nominations").insert(nominationRow("pending", "remove"));
    expect(error).toBeNull();
  });

  it("allows accepted/rejected duplicates of the same (word, direction)", async () => {
    // THE PARTIAL PREDICATE. `WHERE status = 'pending'` is what lets a player
    // re-propose a word that was rejected before — a feature, per the migration.
    // A plain UNIQUE (word, direction) would pass every other test in this block
    // and silently kill re-proposals, so this is the half that needs pinning.
    const first  = await table(service, "nominations").insert(nominationRow("rejected"));
    const second = await table(service, "nominations").insert(nominationRow("rejected"));
    const third  = await table(service, "nominations").insert(nominationRow("accepted"));

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(third.error).toBeNull();

    const { count } = await table(service, "nominations")
      .select("id", { count: "exact", head: true })
      .eq("word", SENTINEL_WORD);
    expect(count).toBe(3);
  });

  it("allows a pending nomination alongside rejected history for the same (word, direction)", async () => {
    // The re-proposal flow end to end: history rows exist, and exactly one new
    // pending row is still allowed on top of them.
    await seedNomination("rejected");
    await seedNomination("rejected");

    const pending = await table(service, "nominations").insert(nominationRow("pending"));
    expect(pending.error).toBeNull();

    // …but only one. The partial index still bites with history present.
    const duplicate = await table(service, "nominations").insert(nominationRow("pending"));
    expect(duplicate.error?.code).toBe("23505");
  });

  it("rejects a second vote from one device on one nomination", async () => {
    const nominationId = await seedNomination("pending");
    const device_id    = `__rls_${crypto.randomUUID()}`;

    const first = await table(service, "nomination_votes")
      .insert({ nomination_id: nominationId, device_id, vote_type: "up" });
    expect(first.error).toBeNull();

    // Same device, same nomination — even switching the vote type. The vote
    // route's undo/switch keys on this row, so a duplicate must be impossible.
    const second = await table(service, "nomination_votes")
      .insert({ nomination_id: nominationId, device_id, vote_type: "down" });
    expect(second.error).not.toBeNull();
    expect(second.error?.code).toBe("23505");
  });

  it("allows one device to vote on two different nominations", async () => {
    // The constraint is on the pair — one device voting across the queue is the
    // normal case and must not be caught by it.
    const firstNomination  = await seedNomination("pending", "add");
    const secondNomination = await seedNomination("pending", "remove");
    const device_id        = `__rls_${crypto.randomUUID()}`;

    const a = await table(service, "nomination_votes")
      .insert({ nomination_id: firstNomination, device_id, vote_type: "up" });
    const b = await table(service, "nomination_votes")
      .insert({ nomination_id: secondNomination, device_id, vote_type: "up" });

    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
  });

  it("allows two devices to vote on one nomination", async () => {
    const nominationId = await seedNomination("pending");

    const a = await table(service, "nomination_votes")
      .insert({ nomination_id: nominationId, device_id: `__rls_${crypto.randomUUID()}`, vote_type: "up" });
    const b = await table(service, "nomination_votes")
      .insert({ nomination_id: nominationId, device_id: `__rls_${crypto.randomUUID()}`, vote_type: "up" });

    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
  });
});
