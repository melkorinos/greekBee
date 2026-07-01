// cleanupScoresRoute.test.ts — unit tests for GET /api/cleanup-scores.
// The Supabase client is mocked so no real network calls are made.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Env stubs (must be set before the route module is imported) ───────────────

const TEST_SECRET = "test-cron-secret";

vi.stubEnv("CRON_SECRET",                TEST_SECRET);
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL",   "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY",  "test-service-role-key");

// ── Supabase mock ─────────────────────────────────────────────────────────────

type DeleteResult = { error: { message: string } | null; count: number | null };

const _results: Record<string, DeleteResult> = {
  game_scores:  { error: null, count: 0 },
  game_state:   { error: null, count: 0 },
  nominations:  { error: null, count: 0 },
};

// Fluent chain: .delete().eq().not().lt() all resolve to the table's result.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      const resolve = () => Promise.resolve(_results[table] ?? { error: null, count: 0 });
      const c: Record<string, unknown> = {};
      c["delete"] = () => c;
      c["eq"]     = () => c;
      c["not"]    = () => c;
      c["lt"]     = resolve;
      return c;
    },
  }),
}));

const { GET } = await import("@/app/api/cleanup-scores/route");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(authHeader?: string): NextRequest {
  return new NextRequest("http://localhost/api/cleanup-scores", {
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

beforeEach(() => {
  _results.game_scores  = { error: null, count: 0 };
  _results.game_state   = { error: null, count: 0 };
  _results.nominations  = { error: null, count: 0 };
});

// ── Auth ──────────────────────────────────────────────────────────────────────

describe("GET /api/cleanup-scores — auth", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is wrong", async () => {
    const res = await GET(makeReq("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe("GET /api/cleanup-scores — happy path", () => {
  it("returns 200 with deleted counts and a YYYY-MM-DD cutoff", async () => {
    _results.game_scores = { error: null, count: 12 };
    _results.game_state  = { error: null, count: 4 };

    const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(200);

    const json = await res.json() as {
      cutoff:  string;
      deleted: { scores: number; gameState: number; nominations: number };
    };
    expect(json.deleted.scores).toBe(12);
    expect(json.deleted.gameState).toBe(4);
    expect(json.deleted.nominations).toBe(0);
    expect(json.cutoff).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("returns deleted: 0 for all tables when nothing is stale", async () => {
    const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(200);
    const json = await res.json() as { deleted: { scores: number; gameState: number; nominations: number } };
    expect(json.deleted.scores).toBe(0);
    expect(json.deleted.gameState).toBe(0);
    expect(json.deleted.nominations).toBe(0);
  });

  it("returns nominations deleted count when accepted+applied nominations are stale", async () => {
    _results.nominations = { error: null, count: 7 };

    const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(200);
    const json = await res.json() as { deleted: { nominations: number } };
    expect(json.deleted.nominations).toBe(7);
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

describe("GET /api/cleanup-scores — error handling", () => {
  it("returns 500 when game_scores delete fails", async () => {
    _results.game_scores = { error: { message: "scores delete failed" }, count: null };

    const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(500);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("scores delete failed");
  });

  it("returns 500 when game_state delete fails", async () => {
    _results.game_state = { error: { message: "state delete failed" }, count: null };

    const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(500);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("state delete failed");
  });

  it("returns 500 when nominations delete fails", async () => {
    _results.nominations = { error: { message: "nominations delete failed" }, count: null };

    const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(500);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("nominations delete failed");
  });
});
