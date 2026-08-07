// gameScoresRoute.test.ts — unit tests for POST /api/game-scores and GET /api/game-scores.
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
  chain.in     = ret;
  chain.order  = ret;
  chain.gt     = ret;
  chain.delete = ret;
  chain.limit  = () => Promise.resolve(result);
  chain.single = () => Promise.resolve(result);
  chain.upsert = () => Promise.resolve(result);
  chain.lt     = () => Promise.resolve(result);
  chain.then   = (resolve: (v: ChainResult) => void) => resolve(result);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  table: (c: { from: (n: string) => unknown }, n: string) => c.from(n),
  getSupabaseClient: () => ({
    from: () => {
      const result = _callQueue.shift() ?? { data: null, error: null, count: null };
      return makeChain(result);
    },
  }),
}));

function enqueue(...results: ChainResult[]) {
  _callQueue.push(...results);
}

// ── Route handlers (imported after mock hoisting) ─────────────────────────────
const { POST, GET } = await import("@/app/api/game-scores/route");

// ── Request factories ─────────────────────────────────────────────────────────

function makePostReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/game-scores", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

function makeGetReq(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/game-scores");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

beforeEach(() => { _callQueue = []; });
afterEach(()  => { _callQueue = []; });

// ── POST — validation ─────────────────────────────────────────────────────────

describe("POST /api/game-scores — validation", () => {
  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/game-scores", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    "not-json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("invalid_json");
  });

  it("returns 400 when game_id is missing", async () => {
    const res = await POST(makePostReq({ puzzle_date: "2026-05-22", device_id: "d1", score: 10 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when puzzle_date is missing", async () => {
    const res = await POST(makePostReq({ game_id: "leksokipos", device_id: "d1", score: 10 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when device_id is missing", async () => {
    const res = await POST(makePostReq({ game_id: "leksokipos", puzzle_date: "2026-05-22", score: 10 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when score is not a number", async () => {
    const res = await POST(makePostReq({ game_id: "leksokipos", puzzle_date: "2026-05-22", device_id: "d1", score: "ten" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-date puzzle_date (custom puzzle)", async () => {
    const res = await POST(makePostReq({ game_id: "leksokipos", puzzle_date: "custom-abc", device_id: "d1", score: 5 }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/Invalid puzzle_date/i);
  });
});

// ── POST — locale suffix stripping ───────────────────────────────────────────

describe("POST /api/game-scores — locale suffix stripping", () => {
  it("accepts puzzle_date with -el suffix and strips it before validating", async () => {
    enqueue({ error: null });
    const res = await POST(makePostReq({
      game_id:      "leksokipos",
      puzzle_date:  "2026-05-22-el",
      device_id:    "d1",
      display_name: "Νίκος",
      score:        10,
    }));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });
});

// ── POST — happy path ─────────────────────────────────────────────────────────

describe("POST /api/game-scores — happy path", () => {
  it("returns { ok: true } when upsert succeeds", async () => {
    enqueue({ error: null });
    const res = await POST(makePostReq({
      game_id:      "leksokipos",
      puzzle_date:  "2026-05-22",
      device_id:    "device-abc",
      display_name: "Νίκος",
      score:        42,
    }));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("succeeds with no display_name (falls back to Ανώνυμος)", async () => {
    enqueue({ error: null });
    const res = await POST(makePostReq({ game_id: "leksindeseis", puzzle_date: "2026-05-22", device_id: "d1", score: 3 }));
    expect(res.status).toBe(200);
  });

  it("returns 500 without leaking the Postgres message when the upsert fails", async () => {
    // This test used to assert the raw message reached the client. It didn't
    // describe a requirement — it pinned the leak in place. The client gets a
    // stable code; the detail goes to the server log (see apiRoute.test.ts).
    enqueue({ error: { message: 'duplicate key value violates unique constraint "game_scores_pkey"' } });
    const res = await POST(makePostReq({
      game_id: "leksokipos", puzzle_date: "2026-05-22", device_id: "d1", display_name: "Νίκος", score: 10,
    }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "db_error" });
  });
});

// ── GET — validation ──────────────────────────────────────────────────────────

describe("GET /api/game-scores — validation", () => {
  it("returns 400 when game_id is missing", async () => {
    const res = await GET(makeGetReq({ puzzle_date: "2026-05-22" }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/game_id/i);
  });

  it("returns 400 when puzzle_date is missing", async () => {
    const res = await GET(makeGetReq({ game_id: "leksokipos" }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/puzzle_date/i);
  });
});

// ── POST — Leksiarxeio branch ─────────────────────────────────────────────────

describe("POST /api/game-scores — Leksiarxeio read-modify-write", () => {
  it("returns 400 for invalid word_length", async () => {
    const res = await POST(makePostReq({
      game_id: "leksiarxeio", puzzle_date: "2026-05-22", device_id: "d1", word_length: 3, points: 4,
    }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/word_length/i);
  });

  it("returns 400 when points is out of range", async () => {
    const res = await POST(makePostReq({
      game_id: "leksiarxeio", puzzle_date: "2026-05-22", device_id: "d1", word_length: 5, points: 7,
    }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/points/i);
  });

  it("creates a new row when no prior row exists", async () => {
    // SELECT → no existing row; upsert → ok
    enqueue({ data: null, error: { message: "no rows" } }, { error: null });
    const res = await POST(makePostReq({
      game_id: "leksiarxeio", puzzle_date: "2026-05-22",
      device_id: "d1", display_name: "Νίκος", word_length: 5, points: 4,
    }));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("merges a new length into an existing row", async () => {
    // SELECT returns existing data with length 4 already recorded
    enqueue(
      { data: { data: { "4": 5 } }, error: null }, // existing row
      { error: null },                               // upsert
    );
    const res = await POST(makePostReq({
      game_id: "leksiarxeio", puzzle_date: "2026-05-22",
      device_id: "d1", display_name: "Νίκος", word_length: 5, points: 3,
    }));
    expect(res.status).toBe(200);
  });

  it("returns 500 when upsert fails", async () => {
    enqueue({ data: null, error: null }, { error: { message: "write failed" } });
    const res = await POST(makePostReq({
      game_id: "leksiarxeio", puzzle_date: "2026-05-22",
      device_id: "d1", word_length: 6, points: 2,
    }));
    expect(res.status).toBe(500);
  });

  it("does not strip locale suffix from Leksiarxeio puzzle_date (plain YYYY-MM-DD)", async () => {
    enqueue({ data: null, error: null }, { error: null });
    const res = await POST(makePostReq({
      game_id: "leksiarxeio", puzzle_date: "2026-05-22",
      device_id: "d1", word_length: 4, points: 6,
    }));
    expect(res.status).toBe(200);
  });
});

// ── GET — happy path ──────────────────────────────────────────────────────────

describe("GET /api/game-scores — happy path", () => {
  it("returns top20 with correct ranks; marks current device as isPlayer", async () => {
    const rows = [
      { device_id: "a", display_name: "Άννα",  score: 100 },
      { device_id: "b", display_name: "Βάσω",  score: 80  },
    ];
    enqueue({ data: rows, error: null });

    const res = await GET(makeGetReq({ game_id: "leksokipos", puzzle_date: "2026-05-22", deviceId: "a" }));
    expect(res.status).toBe(200);
    type Row = { rank: number; display_name: string; score: number; isPlayer: boolean };
    const json = await res.json() as { top20: Row[]; playerRow: null };
    expect(json.top20).toHaveLength(2);
    expect(json.top20[0]).toMatchObject({ rank: 1, display_name: "Άννα", score: 100, isPlayer: true });
    expect(json.top20[1]).toMatchObject({ rank: 2, display_name: "Βάσω", score: 80,  isPlayer: false });
    expect(json.playerRow).toBeNull();
  });

  it("returns pinned playerRow when device is outside top20", async () => {
    const rows = [{ device_id: "a", display_name: "Άννα", score: 100 }];
    enqueue({ data: rows,  error: null });
    enqueue({ data: { display_name: "Εγώ", score: 5 }, error: null });
    enqueue({ data: null, error: null, count: 1 });

    const res = await GET(makeGetReq({ game_id: "leksokipos", puzzle_date: "2026-05-22", deviceId: "outsider" }));
    expect(res.status).toBe(200);
    type PlayerRow = { rank: number; score: number; isPlayer: boolean } | null;
    const json = await res.json() as { top20: unknown[]; playerRow: PlayerRow };
    expect(json.playerRow).not.toBeNull();
    expect(json.playerRow!.rank).toBe(2);
    expect(json.playerRow!.score).toBe(5);
    expect(json.playerRow!.isPlayer).toBe(true);
  });

  it("returns empty top20 and null playerRow when no scores exist", async () => {
    enqueue({ data: [], error: null });
    const res = await GET(makeGetReq({ game_id: "leksindeseis", puzzle_date: "2025-01-01" }));
    const json = await res.json() as { top20: unknown[]; playerRow: null };
    expect(json.top20).toHaveLength(0);
    expect(json.playerRow).toBeNull();
  });

  it("returns 500 when Supabase SELECT returns an error", async () => {
    enqueue({ data: null, error: { message: "connection refused" } });
    const res = await GET(makeGetReq({ game_id: "leksokipos", puzzle_date: "2026-05-22" }));
    expect(res.status).toBe(500);
  });
});

// ── GET — display badges (Handoff B) ──────────────────────────────────────────
//
// After the score rows, the GET fans out to player_profiles.selected_badge_id for
// the returned devices and — for tiered selections — to player_achievements to
// resolve the highest earned tier. Each row carries `badge` (or null).

const TIERED = "leksokipos-kynigos-pangram";
const OTHER  = "leksokipos-stin-korifi";

type BadgedRow = { display_name: string; badge: { achievementId: string; tier: string | null } | null };

describe("GET /api/game-scores — display badges", () => {
  it("attaches each device's resolved badge; a tiered selection resolves the highest earned tier", async () => {
    enqueue(
      { data: [
        { device_id: "a", display_name: "Άννα", score: 100 },
        { device_id: "b", display_name: "Βάσω", score: 80  },
      ], error: null },
      // profiles: two devices, two different badges picked
      { data: [
        { device_uuid: "a", selected_badge_id: TIERED },
        { device_uuid: "b", selected_badge_id: OTHER  },
      ], error: null },
      // achievements: a holds χάλκινο + ασημένιο of the pangram badge; b only χάλκινο
      // of the other. Each device resolves against its OWN earned rows.
      { data: [
        { device_uuid: "a", achievement_id: "leksokipos-kynigos-pangram-chalkino" },
        { device_uuid: "a", achievement_id: "leksokipos-kynigos-pangram-asimenio" },
        { device_uuid: "b", achievement_id: "leksokipos-stin-korifi-chalkino" },
      ], error: null },
    );

    const res = await GET(makeGetReq({ game_id: "leksokipos", puzzle_date: "2026-05-22", deviceId: "a" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { top20: BadgedRow[] };
    const anna = json.top20.find((r) => r.display_name === "Άννα")!;
    const vaso = json.top20.find((r) => r.display_name === "Βάσω")!;
    expect(anna.badge).toEqual({ achievementId: TIERED, tier: "asimenio" });
    expect(vaso.badge).toEqual({ achievementId: OTHER,  tier: "chalkino" });
  });

  it("resolves a dangling tiered selection (no earned tier rows) to no badge", async () => {
    enqueue(
      { data: [{ device_id: "a", display_name: "Άννα", score: 100 }], error: null },
      { data: [{ device_uuid: "a", selected_badge_id: TIERED }], error: null },
      { data: [], error: null }, // achievements — none earned
    );
    const res = await GET(makeGetReq({ game_id: "leksokipos", puzzle_date: "2026-05-22", deviceId: "a" }));
    const json = await res.json() as { top20: BadgedRow[] };
    expect(json.top20[0].badge).toBeNull();
  });

  it("carries null badge for a device with no selection", async () => {
    enqueue(
      { data: [{ device_id: "a", display_name: "Άννα", score: 100 }], error: null },
      { data: [], error: null }, // profiles — no selection rows
    );
    const res = await GET(makeGetReq({ game_id: "leksokipos", puzzle_date: "2026-05-22", deviceId: "a" }));
    const json = await res.json() as { top20: BadgedRow[] };
    expect(json.top20[0].badge).toBeNull();
  });
});
