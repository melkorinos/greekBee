// profileStatsRoute.test.ts — GET /api/profile/stats.
//
// Read-only lifetime stats for one device: total points and puzzles played
// (cross-game), plus Τζιμάνι count (leksokipos perfect dailies). Supabase is
// mocked; the aggregation itself is covered by lifetimeStats.test.ts.

import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { rowsHolder, mockEq, mockLt } = vi.hoisted(() => {
  const rowsHolder = { rows: [] as unknown[] };
  // .eq() is the terminal call and resolves the query. .lt() is exposed on the
  // result too so the test can prove the route never applies a date filter — a
  // filter here would silently window-cap "lifetime" stats (issue 03 / ADR 0012).
  const mockLt = vi.fn(() => Promise.resolve({ data: rowsHolder.rows, error: null }));
  const mockEq = vi.fn(() => {
    const p = Promise.resolve({ data: rowsHolder.rows, error: null }) as Promise<unknown> & { lt: typeof mockLt };
    p.lt = mockLt;
    return p;
  });
  return { rowsHolder, mockEq, mockLt };
});

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    from: () => ({ select: () => ({ eq: mockEq }) }),
  }),
}));

import { GET } from "@/app/api/profile/stats/route";

function req(query: string) {
  return new NextRequest(`http://localhost/api/profile/stats${query}`);
}

describe("GET /api/profile/stats", () => {
  it("returns 400 when device_uuid is missing", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });

  it("returns aggregated stats for the device, filtered by its device_id", async () => {
    rowsHolder.rows = [
      { game_id: "leksokipos",  score: 120, is_perfect: true  },
      { game_id: "leksiarxeio", score: 30,  is_perfect: true  },
    ];
    const res = await GET(req("?device_uuid=dev-A"));
    expect(res.status).toBe(200);
    expect(mockEq).toHaveBeenCalledWith("device_id", "dev-A");
    expect(await res.json()).toEqual({ total_points: 150, puzzles_played: 2, tzimani_count: 1 });
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=60");
  });

  it("aggregates the FULL history — never applies a puzzle_date window filter", async () => {
    // Rows the DB returns already span all time; the route must not narrow them.
    // If a date filter were ever added, "Lifetime Stats" would silently become
    // last-N-days stats (the exact bug issue 03 fixed).
    rowsHolder.rows = [
      { game_id: "leksokipos", score: 500, is_perfect: true }, // notionally very old
      { game_id: "leksokipos", score: 40,  is_perfect: false }, // recent
    ];
    const res = await GET(req("?device_uuid=dev-A"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ total_points: 540, puzzles_played: 2, tzimani_count: 1 });
    expect(mockLt).not.toHaveBeenCalled();
  });
});
