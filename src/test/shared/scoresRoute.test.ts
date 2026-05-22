// scoresRoute.test.ts — unit tests for POST /api/scores and GET /api/scores.
//
// Supabase is mocked at the module level so no real network calls are made.
// Each test pops results from a call queue in the order from() is invoked.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

type ChainResult = { data?: unknown; error?: { message: string } | null; count?: number | null };

let _callQueue: ChainResult[] = [];

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.select = ret;
  chain.eq     = ret;
  chain.order  = ret;
  chain.gt     = ret;
  chain.delete = ret;
  // Terminal methods — return a resolved Promise
  chain.limit  = () => Promise.resolve(result);
  chain.single = () => Promise.resolve(result);
  chain.upsert = () => Promise.resolve(result);
  chain.lt     = () => Promise.resolve(result); // used by fire-and-forget cleanup
  // Make the chain itself awaitable — handles cases where the last chained
  // method returns `chain` (e.g. `.gt()`), and the caller does `await chain`.
  chain.then   = (resolve: (v: ChainResult) => void) => resolve(result);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    from: (_table: string) => {
      const result = _callQueue.shift() ?? { data: null, error: null, count: null };
      return makeChain(result);
    },
  }),
}));

/** Push results onto the queue in the order from() will be called. */
function enqueue(...results: ChainResult[]) {
  _callQueue.push(...results);
}

// ── Route handlers (imported after mock hoisting) ─────────────────────────────
const { POST, GET } = await import("@/app/api/scores/route");

// ── Request factories ─────────────────────────────────────────────────────────

function makePostReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/scores", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

function makeGetReq(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/scores");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

beforeEach(() => { _callQueue = []; });
afterEach(()  => { _callQueue = []; });

// ── POST — validation ─────────────────────────────────────────────────────────

describe("POST /api/scores — validation", () => {
  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/scores", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    "not-json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/Invalid JSON/i);
  });

  it("returns 400 when puzzle_id is missing", async () => {
    const res = await POST(makePostReq({ device_id: "d1", score: 10 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when device_id is missing", async () => {
    const res = await POST(makePostReq({ puzzle_id: "2026-05-18", score: 10 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when score is not a number", async () => {
    const res = await POST(makePostReq({ puzzle_id: "2026-05-18", device_id: "d1", score: "ten" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-date puzzle_id (custom puzzle)", async () => {
    const res = await POST(makePostReq({ puzzle_id: "custom-a-bcdefg", device_id: "d1", score: 5 }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/Invalid puzzle_id/i);
  });
});

// ── POST — happy path ─────────────────────────────────────────────────────────

describe("POST /api/scores — happy path", () => {
  it("returns { ok: true } when upsert succeeds", async () => {
    enqueue({ error: null }, { error: null }); // upsert + fire-and-forget cleanup
    const res = await POST(makePostReq({
      puzzle_id:    "2026-05-18",
      device_id:    "device-abc",
      display_name: "Nikos",
      score:        42,
    }));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("succeeds with no display_name (falls back to default)", async () => {
    enqueue({ error: null }, { error: null }); // upsert + fire-and-forget cleanup
    const res = await POST(makePostReq({ puzzle_id: "2026-05-18", device_id: "d1", score: 5 }));
    expect(res.status).toBe(200);
  });

  it("returns 500 when Supabase upsert returns an error", async () => {
    enqueue({ error: { message: "DB exploded" } });
    const res = await POST(makePostReq({
      puzzle_id: "2026-05-18", device_id: "d1", display_name: "Nikos", score: 10,
    }));
    expect(res.status).toBe(500);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("DB exploded");
  });
});

// ── GET — validation ──────────────────────────────────────────────────────────

describe("GET /api/scores — validation", () => {
  it("returns 400 when puzzleId is missing", async () => {
    const res = await GET(makeGetReq({}));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/puzzleId/i);
  });
});

// ── GET — happy path ──────────────────────────────────────────────────────────

describe("GET /api/scores — happy path", () => {
  it("returns top20 with correct ranks; marks current device as isPlayer", async () => {
    const rows = [
      { device_id: "a", display_name: "Anna",  score: 100 },
      { device_id: "b", display_name: "Vasso", score: 80  },
    ];
    enqueue({ data: rows, error: null }); // top20 SELECT

    const res = await GET(makeGetReq({ puzzleId: "2026-05-18", deviceId: "a" }));
    expect(res.status).toBe(200);
    type Row = { rank: number; display_name: string; score: number; isPlayer: boolean };
    const json = await res.json() as { top20: Row[]; playerRow: null };
    expect(json.top20).toHaveLength(2);
    expect(json.top20[0]).toMatchObject({ rank: 1, display_name: "Anna", score: 100, isPlayer: true });
    expect(json.top20[1]).toMatchObject({ rank: 2, display_name: "Vasso", score: 80, isPlayer: false });
    expect(json.playerRow).toBeNull();
  });

  it("returns pinned playerRow when device is outside top20", async () => {
    const rows = [{ device_id: "a", display_name: "Anna", score: 100 }];
    enqueue({ data: rows,  error: null });                          // top20 SELECT
    enqueue({ data: { display_name: "Me", score: 5 }, error: null }); // player single()
    enqueue({ data: null, error: null, count: 1 });                // count gt

    const res = await GET(makeGetReq({ puzzleId: "2026-05-18", deviceId: "outsider" }));
    expect(res.status).toBe(200);
    type PlayerRow = { rank: number; score: number; isPlayer: boolean } | null;
    const json = await res.json() as { top20: unknown[]; playerRow: PlayerRow };
    expect(json.playerRow).not.toBeNull();
    expect(json.playerRow!.rank).toBe(2);  // 1 player ranked above => rank 2
    expect(json.playerRow!.score).toBe(5);
    expect(json.playerRow!.isPlayer).toBe(true);
  });

  it("returns empty top20 and null playerRow when no scores exist", async () => {
    enqueue({ data: [], error: null });
    const res = await GET(makeGetReq({ puzzleId: "2025-01-01" }));
    const json = await res.json() as { top20: unknown[]; playerRow: null };
    expect(json.top20).toHaveLength(0);
    expect(json.playerRow).toBeNull();
  });

  it("returns 500 when Supabase SELECT returns an error", async () => {
    enqueue({ data: null, error: { message: "connection refused" } });
    const res = await GET(makeGetReq({ puzzleId: "2026-05-18" }));
    expect(res.status).toBe(500);
  });
});
