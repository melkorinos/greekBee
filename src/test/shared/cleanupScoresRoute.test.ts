// cleanupScoresRoute.test.ts — unit tests for GET /api/cleanup-scores.
// The Supabase client is mocked so no real network calls are made.
//
// This cron prunes ONLY ephemeral session data (game_state, transfer_codes) plus
// applied nominations. game_scores is the append-forever lifetime-stats substrate
// (ADR 0012) and must NEVER be deleted here — these tests lock that in.

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
  game_state:      { error: null, count: 0 },
  transfer_codes:  { error: null, count: 0 },
  nominations:     { error: null, count: 0 },
};

// Records every table a .delete() was invoked on, so tests can assert that
// game_scores is never touched.
const deletedTables = new Set<string>();

// Fluent chain: .delete().eq().not().lt() all resolve to the table's result.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      const resolve = () => Promise.resolve(_results[table] ?? { error: null, count: 0 });
      const c: Record<string, unknown> = {};
      c["delete"] = () => { deletedTables.add(table); return c; };
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
  _results.game_state      = { error: null, count: 0 };
  _results.transfer_codes  = { error: null, count: 0 };
  _results.nominations     = { error: null, count: 0 };
  deletedTables.clear();
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

// ── Append-forever tables are never pruned (ADR 0012 / ADR 0013) ────────────────

describe("GET /api/cleanup-scores — never touches append-forever tables", () => {
  it("does not issue a delete against game_scores", async () => {
    await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(deletedTables.has("game_scores")).toBe(false);
  });

  it("does not issue a delete against the lifetime fact tables (achievements, pangrams)", async () => {
    // player_pangrams (B2) and player_achievements are append-forever lifetime
    // substrate (ADR 0013) — the same stance as game_scores. Sweeping either would
    // silently shrink a player's earned/progress history.
    await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(deletedTables.has("player_pangrams")).toBe(false);
    expect(deletedTables.has("player_achievements")).toBe(false);
  });

  it("does prune the ephemeral game_state and transfer_codes tables", async () => {
    await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(deletedTables.has("game_state")).toBe(true);
    expect(deletedTables.has("transfer_codes")).toBe(true);
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe("GET /api/cleanup-scores — happy path", () => {
  it("returns 200 with deleted counts and a YYYY-MM-DD cutoff", async () => {
    _results.game_state      = { error: null, count: 4 };
    _results.transfer_codes  = { error: null, count: 2 };

    const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(200);

    const json = await res.json() as {
      cutoff:  string;
      deleted: { gameState: number; transferCodes: number; nominations: number };
    };
    expect(json.deleted.gameState).toBe(4);
    expect(json.deleted.transferCodes).toBe(2);
    expect(json.deleted.nominations).toBe(0);
    expect(json.cutoff).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("returns deleted: 0 for all tables when nothing is stale", async () => {
    const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(200);
    const json = await res.json() as { deleted: { gameState: number; transferCodes: number; nominations: number } };
    expect(json.deleted.gameState).toBe(0);
    expect(json.deleted.transferCodes).toBe(0);
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
  it("returns 500 when game_state delete fails", async () => {
    _results.game_state = { error: { message: "state delete failed" }, count: null };

    const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(500);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("state delete failed");
  });

  it("returns 500 when transfer_codes delete fails", async () => {
    _results.transfer_codes = { error: { message: "transfer_codes delete failed" }, count: null };

    const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(500);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("transfer_codes delete failed");
  });

  it("returns 500 when nominations delete fails", async () => {
    _results.nominations = { error: { message: "nominations delete failed" }, count: null };

    const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(500);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("nominations delete failed");
  });
});
