// profileStatsRoute.test.ts — GET /api/profile/stats.
//
// Read-only lifetime stats for one device: total points and puzzles played
// (cross-game), plus leksokipos_points (leksokipos-only) from the game_scores
// aggregate and pangram_count — a parallel COUNT(*) over the separate
// player_pangrams table (B2). Supabase is mocked; the pure reduce itself is
// covered by lifetimeStats.test.ts.
//
// Both queries are device-scoped: one game_scores aggregate and one
// player_pangrams head count. The mock branches on the table name.

import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { holder, mockScoresEq, mockPangramEq, mockLt } = vi.hoisted(() => {
  const holder = {
    rows: [] as unknown[],
    pangramCount: 0 as number | null,
    scoresError: null as { message: string } | null,
    pangramError: null as { message: string } | null,
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
  // player_pangrams: HEAD exact count scoped to the device — returns { count }.
  const mockPangramEq = vi.fn(() => Promise.resolve({ count: holder.pangramCount, error: holder.pangramError }));
  return { holder, mockScoresEq, mockPangramEq, mockLt };
});

vi.mock("@/lib/supabase", () => ({
  table: (c: { from: (n: string) => unknown }, n: string) => c.from(n),
  getSupabaseClient: () => ({
    from: (table: string) =>
      table === "player_pangrams"
        ? { select: () => ({ eq: mockPangramEq }) }
        : { select: () => ({ eq: mockScoresEq }) },
  }),
}));

import { GET } from "@/app/api/profile/stats/route";

function req(query: string) {
  return new NextRequest(`http://localhost/api/profile/stats${query}`);
}

function reset() {
  holder.rows = [];
  holder.pangramCount = 0;
  holder.scoresError = null;
  holder.pangramError = null;
  mockScoresEq.mockClear();
  mockPangramEq.mockClear();
  mockLt.mockClear();
}

describe("GET /api/profile/stats", () => {
  it("returns 400 when device_uuid is missing", async () => {
    reset();
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });

  it("returns aggregated stats + pangram_count for the device", async () => {
    reset();
    holder.rows = [
      { game_id: "leksokipos",  score: 120 },
      { game_id: "leksiarxeio", score: 30  },
    ];
    holder.pangramCount = 7;
    const res = await GET(req("?device_uuid=dev-A"));
    expect(res.status).toBe(200);
    expect(mockScoresEq).toHaveBeenCalledWith("device_id", "dev-A");
    expect(mockPangramEq).toHaveBeenCalledWith("device_uuid", "dev-A");
    expect(await res.json()).toEqual({
      total_points: 150, puzzles_played: 2,
      leksokipos_points: 120, pangram_count: 7,
    });
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=60");
  });

  it("500 when the game_scores aggregate query errors", async () => {
    reset();
    holder.scoresError = { message: "scores fetch failed" };
    const res = await GET(req("?device_uuid=dev-A"));
    expect(res.status).toBe(500);
  });

  it("defaults pangram_count to 0 when the device has no pangram rows", async () => {
    reset();
    holder.rows = [{ game_id: "leksokipos", score: 40 }];
    holder.pangramCount = null; // supabase returns null count for an empty set
    const res = await GET(req("?device_uuid=dev-A"));
    expect((await res.json()).pangram_count).toBe(0);
  });

  it("aggregates the FULL history — never applies a puzzle_date window filter", async () => {
    reset();
    holder.rows = [
      { game_id: "leksokipos", score: 500 },
      { game_id: "leksokipos", score: 40  },
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
