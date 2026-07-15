// profileStatsRoute.test.ts — GET /api/profile/stats.
//
// Read-only lifetime stats for one device: total points and puzzles played
// (cross-game), plus Τζιμάνι count and leksokipos_points (leksokipos-only) from
// the game_scores aggregate, pangram_count — a parallel COUNT(*) over the
// separate player_pangrams table (B2) — and leksokipos_first_place_count, derived
// from a cross-device Leksokipos fetch (ADR 0014). Supabase is mocked; the pure
// reduces themselves are covered by lifetimeStats.test.ts / placement.test.ts.
//
// The route issues TWO game_scores selects: the device aggregate (columns
// "game_id, score, is_perfect") and the cross-device placement fetch (columns
// "device_id, puzzle_date, score"). The mock branches on the requested columns.

import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { holder, mockScoresEq, mockPangramEq, mockLeksokiposEq, mockLt } = vi.hoisted(() => {
  const holder = {
    rows: [] as unknown[],
    leksokiposRows: [] as unknown[],
    pangramCount: 0 as number | null,
    scoresError: null as { message: string } | null,
    pangramError: null as { message: string } | null,
    leksokiposError: null as { message: string } | null,
  };
  // game_scores device aggregate: .eq() is terminal. .lt() is exposed so the test
  // can prove the route never applies a date filter — a filter would window-cap
  // "lifetime" stats (issue 03 / ADR 0012).
  const mockLt = vi.fn(() => Promise.resolve({ data: holder.rows, error: holder.scoresError }));
  const mockScoresEq = vi.fn(() => {
    const p = Promise.resolve({ data: holder.rows, error: holder.scoresError }) as Promise<unknown> & { lt: typeof mockLt };
    p.lt = mockLt;
    return p;
  });
  // game_scores placement fetch: eq("game_id", "leksokipos"), returns all rows.
  const mockLeksokiposEq = vi.fn(() => Promise.resolve({ data: holder.leksokiposRows, error: holder.leksokiposError }));
  // player_pangrams: HEAD exact count scoped to the device — returns { count }.
  const mockPangramEq = vi.fn(() => Promise.resolve({ count: holder.pangramCount, error: holder.pangramError }));
  return { holder, mockScoresEq, mockPangramEq, mockLeksokiposEq, mockLt };
});

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    from: (table: string) =>
      table === "player_pangrams"
        ? { select: () => ({ eq: mockPangramEq }) }
        : { select: (cols: string) =>
            cols.includes("puzzle_date")
              ? { eq: mockLeksokiposEq }
              : { eq: mockScoresEq } },
  }),
}));

import { GET } from "@/app/api/profile/stats/route";

function req(query: string) {
  return new NextRequest(`http://localhost/api/profile/stats${query}`);
}

function reset() {
  holder.rows = [];
  holder.leksokiposRows = [];
  holder.pangramCount = 0;
  holder.scoresError = null;
  holder.pangramError = null;
  holder.leksokiposError = null;
  mockScoresEq.mockClear();
  mockPangramEq.mockClear();
  mockLeksokiposEq.mockClear();
  mockLt.mockClear();
}

describe("GET /api/profile/stats", () => {
  it("returns 400 when device_uuid is missing", async () => {
    reset();
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });

  it("returns aggregated stats + pangram_count + first-place count for the device", async () => {
    reset();
    holder.rows = [
      { game_id: "leksokipos",  score: 120, is_perfect: true },
      { game_id: "leksiarxeio", score: 30,  is_perfect: true },
    ];
    holder.pangramCount = 7;
    // Cross-device Leksokipos rows: dev-A tops 2026-07-10, is beaten 2026-07-11.
    holder.leksokiposRows = [
      { device_id: "dev-A", puzzle_date: "2026-07-10", score: 120 },
      { device_id: "dev-B", puzzle_date: "2026-07-10", score: 40 },
      { device_id: "dev-A", puzzle_date: "2026-07-11", score: 30 },
      { device_id: "dev-B", puzzle_date: "2026-07-11", score: 99 },
    ];
    const res = await GET(req("?device_uuid=dev-A"));
    expect(res.status).toBe(200);
    expect(mockScoresEq).toHaveBeenCalledWith("device_id", "dev-A");
    expect(mockPangramEq).toHaveBeenCalledWith("device_uuid", "dev-A");
    expect(mockLeksokiposEq).toHaveBeenCalledWith("game_id", "leksokipos");
    expect(await res.json()).toEqual({
      total_points: 150, puzzles_played: 2, tzimani_count: 1,
      leksokipos_points: 120, pangram_count: 7, leksokipos_first_place_count: 1,
    });
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=60");
  });

  it("500 when the cross-device Leksokipos placement query errors", async () => {
    reset();
    holder.leksokiposError = { message: "placement fetch failed" };
    const res = await GET(req("?device_uuid=dev-A"));
    expect(res.status).toBe(500);
  });

  it("defaults pangram_count to 0 when the device has no pangram rows", async () => {
    reset();
    holder.rows = [{ game_id: "leksokipos", score: 40, is_perfect: false }];
    holder.pangramCount = null; // supabase returns null count for an empty set
    const res = await GET(req("?device_uuid=dev-A"));
    expect((await res.json()).pangram_count).toBe(0);
  });

  it("aggregates the FULL history — never applies a puzzle_date window filter", async () => {
    reset();
    holder.rows = [
      { game_id: "leksokipos", score: 500, is_perfect: true },
      { game_id: "leksokipos", score: 40,  is_perfect: false },
    ];
    const res = await GET(req("?device_uuid=dev-A"));
    expect(res.status).toBe(200);
    expect((await res.json()).total_points).toBe(540);
    expect(mockLt).not.toHaveBeenCalled();
  });

  it("500 when the pangram count query errors", async () => {
    reset();
    holder.pangramError = { message: "count failed" };
    const res = await GET(req("?device_uuid=dev-A"));
    expect(res.status).toBe(500);
  });
});
