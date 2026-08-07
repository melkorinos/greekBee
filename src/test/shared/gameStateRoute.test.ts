// gameStateRoute.test.ts — unit tests for POST/GET /api/game-state.
// Supabase is mocked; no real network calls are made.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

import { makeQueuedClient, tableShim } from "@/test/helpers/supabaseMock";

const _db = makeQueuedClient();

vi.mock("@/lib/supabase", () => ({
  table: tableShim,
  getSupabaseClient: () => _db.client,
}));

const { POST, GET } = await import("@/app/api/game-state/route");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePostReq(body: unknown) {
  return new NextRequest("http://localhost/api/game-state", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

function makeGetReq(params: Record<string, string>) {
  const url = new URL("http://localhost/api/game-state");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const enqueue = _db.enqueue;

beforeEach(() => { _db.reset(); });
afterEach(()  => { _db.reset(); });

const VALID_POST = {
  device_uuid: "device-1",
  game_id:     "leksokipos",
  puzzle_date: "2026-05-22",
  state:       { foundWords: ["καλο"], score: 4 },
};

// ── POST — validation ─────────────────────────────────────────────────────────

describe("POST /api/game-state — validation", () => {
  it("400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/game-state", {
      method: "POST", body: "{bad", headers: { "Content-Type": "application/json" },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("400 when device_uuid is missing", async () => {
    const res = await POST(makePostReq({ ...VALID_POST, device_uuid: undefined }));
    expect(res.status).toBe(400);
  });

  it("400 when game_id is missing", async () => {
    const res = await POST(makePostReq({ ...VALID_POST, game_id: undefined }));
    expect(res.status).toBe(400);
  });

  it("400 when puzzle_date is not ISO format", async () => {
    const res = await POST(makePostReq({ ...VALID_POST, puzzle_date: "not-a-date" }));
    expect(res.status).toBe(400);
  });

  it("400 when state is missing", async () => {
    const res = await POST(makePostReq({ ...VALID_POST, state: undefined }));
    expect(res.status).toBe(400);
  });
});

// ── POST — happy path ─────────────────────────────────────────────────────────

describe("POST /api/game-state — happy path", () => {
  it("200 ok on successful upsert", async () => {
    enqueue({ error: null });
    const res = await POST(makePostReq(VALID_POST));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("strips locale suffix from puzzle_date before upsert", async () => {
    enqueue({ error: null });
    const res = await POST(makePostReq({ ...VALID_POST, puzzle_date: "2026-05-22-el" }));
    // normalizePuzzleDate strips "-el"; the resulting "2026-05-22" passes isISODate
    expect(res.status).toBe(200);
  });

  it("500 when DB upsert returns an error", async () => {
    enqueue({ error: { message: "DB failure" } });
    const res = await POST(makePostReq(VALID_POST));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});

// ── GET — validation ──────────────────────────────────────────────────────────

describe("GET /api/game-state — validation", () => {
  it("400 when device_uuid is missing", async () => {
    const res = await GET(makeGetReq({ game_id: "leksokipos", puzzle_date: "2026-05-22" }));
    expect(res.status).toBe(400);
  });

  it("400 when game_id is missing", async () => {
    const res = await GET(makeGetReq({ device_uuid: "d1", puzzle_date: "2026-05-22" }));
    expect(res.status).toBe(400);
  });

  it("400 when puzzle_date is missing", async () => {
    const res = await GET(makeGetReq({ device_uuid: "d1", game_id: "leksokipos" }));
    expect(res.status).toBe(400);
  });
});

// ── GET — happy path ──────────────────────────────────────────────────────────

describe("GET /api/game-state — happy path", () => {
  const BASE_PARAMS = { device_uuid: "d1", game_id: "leksokipos", puzzle_date: "2026-05-22" };

  it("returns the state blob when the row is found", async () => {
    enqueue({ data: { state: { foundWords: ["καλο"] } }, error: null });
    const res = await GET(makeGetReq(BASE_PARAMS));
    expect(res.status).toBe(200);
    expect((await res.json()).state).toEqual({ foundWords: ["καλο"] });
  });

  it("returns { state: null } when PostgREST PGRST116 (no rows)", async () => {
    enqueue({ data: null, error: { code: "PGRST116", message: "no rows" } });
    const res = await GET(makeGetReq(BASE_PARAMS));
    expect(res.status).toBe(200);
    expect((await res.json()).state).toBeNull();
  });

  it("500 on unexpected DB error", async () => {
    enqueue({ data: null, error: { message: "connection refused" } });
    const res = await GET(makeGetReq(BASE_PARAMS));
    expect(res.status).toBe(500);
  });
});
