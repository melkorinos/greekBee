// milestonesRoute.test.ts — unit tests for POST /api/milestones.
//
// Supabase is mocked; no real network. This one route replaces /api/pangrams and
// /api/words (ADR 0013 / badgeIdeas.md). The write path is insert-if-absent
// (ON CONFLICT (device_uuid,puzzle_date,kind,detail) DO NOTHING) so a re-submitted
// milestone is a no-op, and the response carries the device's fresh lifetime count
// for the kinds it just wrote — enough for a lane to see a tier crossing in the same
// round-trip, with no lag.
//
// Two cost rules the route exists to enforce, both verified here:
//   - the count query is SKIPPED entirely when no row was actually inserted;
//   - counts come back only for the kinds the caller posted, never all four.
//
// Shape hygiene lives in sanitizeMilestones (covered in milestones.test.ts); this
// file covers what the route does with the result.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

import { makeQueuedClient, tableShim, type ChainResult } from "@/test/helpers/supabaseMock";

let _lastUpsert: { rows: unknown; options: unknown } | null = null;
let _lastSelectAfterUpsert: unknown = null;
let _rpcCalls: { fn: string; args: unknown }[] = [];
let _rpcResult: ChainResult = { data: [], error: null };

// The route calls .select(...) on the upsert to learn which rows were NEW —
// ON CONFLICT DO NOTHING ... RETURNING yields only actually-inserted rows — so
// the select recorded here is the one chained onto the upsert.
const _db = makeQueuedClient({
  onCall: ({ op, args }) => {
    if (op === "upsert") _lastUpsert = { rows: args[0], options: args[1] };
    if (op === "select") _lastSelectAfterUpsert = args[0];
  },
});

vi.mock("@/lib/supabase", () => ({
  table: tableShim,
  getSupabaseClient: () => ({
    ..._db.client,
    rpc: (fn: string, args: unknown) => { _rpcCalls.push({ fn, args }); return Promise.resolve(_rpcResult); },
  }),
}));

const { POST } = await import("@/app/api/milestones/route");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePostReq(body: unknown) {
  return new NextRequest("http://localhost/api/milestones", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

const enqueue = _db.enqueue;

function reset() {
  _db.reset();
  _lastUpsert = null;
  _lastSelectAfterUpsert = null;
  _rpcCalls = [];
  _rpcResult = { data: [], error: null };
}

beforeEach(reset);
afterEach(reset);

const VALID_POST = {
  device_uuid: "device-1",
  puzzle_date: "2026-07-06",
  milestones:  [{ kind: "pangram", detail: "διακοπτησ" }],
};

// ── happy path ────────────────────────────────────────────────────────────────

describe("POST /api/milestones — happy path", () => {
  it("insert-if-absents the milestones and returns the fresh count for the posted kind", async () => {
    enqueue({ data: [{ kind: "pangram" }], error: null });
    _rpcResult = { data: [{ kind: "pangram", count: 27 }, { kind: "word", count: 4 }], error: null };

    const res = await POST(makePostReq(VALID_POST));
    expect(res.status).toBe(200);

    // 'word' was not posted, so its count is withheld — a lane pays only for what it asked.
    expect(await res.json()).toEqual({ counts: { pangram: 27 } });

    expect(_lastUpsert?.options).toMatchObject({
      onConflict:       "device_uuid,puzzle_date,kind,detail",
      ignoreDuplicates: true,
    });
    expect(_lastUpsert?.rows).toEqual([
      { device_uuid: "device-1", puzzle_date: "2026-07-06", kind: "pangram", detail: "διακοπτησ", value: null },
    ]);
    expect(_rpcCalls).toEqual([{ fn: "player_milestone_counts", args: { p_device_uuid: "device-1" } }]);
  });

  it("stamps a word's length as `value` server-side", async () => {
    enqueue({ data: [{ kind: "word" }], error: null });
    _rpcResult = { data: [{ kind: "word", count: 9 }], error: null };

    const res = await POST(makePostReq({
      device_uuid: "device-1",
      puzzle_date: "2026-07-06",
      milestones:  [{ kind: "word", detail: "Παρακολούθηση", value: 999 }],
    }));
    expect(res.status).toBe(200);
    expect(_lastUpsert?.rows).toEqual([
      { device_uuid: "device-1", puzzle_date: "2026-07-06", kind: "word", detail: "παρακολουθηση", value: 13 },
    ]);
  });

  it("returns counts for several posted kinds at once", async () => {
    enqueue({ data: [{ kind: "word" }, { kind: "pangram" }], error: null });
    _rpcResult = {
      data:  [{ kind: "pangram", count: 27 }, { kind: "word", count: 4 }, { kind: "top_rank", count: 11 }],
      error: null,
    };

    const res = await POST(makePostReq({
      device_uuid: "device-1",
      puzzle_date: "2026-07-06",
      milestones:  [
        { kind: "word", detail: "παρακολουθηση" },
        { kind: "pangram", detail: "παρακολουθηση" },
      ],
    }));
    expect(await res.json()).toEqual({ counts: { word: 4, pangram: 27 } });
  });

  it("records a day counter with an empty detail", async () => {
    enqueue({ data: [{ kind: "tzimani" }], error: null });
    _rpcResult = { data: [{ kind: "tzimani", count: 3 }], error: null };

    const res = await POST(makePostReq({
      device_uuid: "device-1",
      puzzle_date: "2026-07-06",
      milestones:  [{ kind: "tzimani", value: 74 }],
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ counts: { tzimani: 3 } });
    expect(_lastUpsert?.rows).toEqual([
      { device_uuid: "device-1", puzzle_date: "2026-07-06", kind: "tzimani", detail: "", value: 74 },
    ]);
  });

  it("reports a count of 0 for a posted kind the aggregate has no row for", async () => {
    // Defensive: an inserted kind should always appear, but a missing aggregate row
    // must read as zero rather than vanish from the response.
    enqueue({ data: [{ kind: "top_rank" }], error: null });
    _rpcResult = { data: [], error: null };

    const res = await POST(makePostReq({
      device_uuid: "device-1",
      puzzle_date: "2026-07-06",
      milestones:  [{ kind: "top_rank" }],
    }));
    expect(await res.json()).toEqual({ counts: { top_rank: 0 } });
  });
});

// ── the two cost rules ────────────────────────────────────────────────────────

describe("POST /api/milestones — cost rules", () => {
  it("skips the count query entirely when the insert was a full no-op", async () => {
    // Every posted milestone was already recorded (the mount self-heal re-posting a
    // round's finds). Nothing was written, so no total can have changed.
    enqueue({ data: [], error: null });

    const res = await POST(makePostReq(VALID_POST));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ counts: {} });
    expect(_rpcCalls).toEqual([]);
  });

  it("touches the database not at all when nothing survives sanitizing", async () => {
    const res = await POST(makePostReq({
      device_uuid: "device-1",
      puzzle_date: "2026-07-06",
      milestones:  [{ kind: "word", detail: "γατα" }], // below the ≥10 floor
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ counts: {} });
    expect(_lastUpsert).toBeNull();
    expect(_rpcCalls).toEqual([]);
  });

  it("asks the insert to return only the kind column, never whole rows", async () => {
    enqueue({ data: [{ kind: "pangram" }], error: null });
    _rpcResult = { data: [{ kind: "pangram", count: 1 }], error: null };
    await POST(makePostReq(VALID_POST));
    expect(_lastSelectAfterUpsert).toBe("kind");
  });
});

// ── validation ────────────────────────────────────────────────────────────────

describe("POST /api/milestones — validation", () => {
  it("400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/milestones", {
      method: "POST", body: "{bad", headers: { "Content-Type": "application/json" },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("400 when device_uuid is missing", async () => {
    const res = await POST(makePostReq({ ...VALID_POST, device_uuid: undefined }));
    expect(res.status).toBe(400);
    expect(_lastUpsert).toBeNull();
  });

  it("400 when puzzle_date is not an ISO date", async () => {
    const res = await POST(makePostReq({ ...VALID_POST, puzzle_date: "07/06/2026" }));
    expect(res.status).toBe(400);
    expect(_lastUpsert).toBeNull();
  });
});

// ── DB errors ─────────────────────────────────────────────────────────────────

describe("POST /api/milestones — DB errors", () => {
  it("500 when the insert returns an error", async () => {
    enqueue({ data: null, error: { message: "DB write failure" } });
    const res = await POST(makePostReq(VALID_POST));
    expect(res.status).toBe(500);
  });

  it("500 when the count aggregate returns an error", async () => {
    enqueue({ data: [{ kind: "pangram" }], error: null });
    _rpcResult = { data: null, error: { message: "aggregate failed" } };
    const res = await POST(makePostReq(VALID_POST));
    expect(res.status).toBe(500);
  });

  it("never leaks the database message to the caller", async () => {
    enqueue({ data: null, error: { message: "relation player_milestones does not exist" } });
    const res = await POST(makePostReq(VALID_POST));
    const body = await res.json() as { error: string };
    expect(body.error).not.toContain("relation");
  });
});
