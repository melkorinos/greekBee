// profileStatsRoute.test.ts — GET /api/profile/stats.
//
// Read-only lifetime stats for one device: total points and puzzles played
// (cross-game), plus Τζιμάνι count (leksokipos perfect dailies). Supabase is
// mocked; the aggregation itself is covered by lifetimeStats.test.ts.

import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { rowsHolder, mockEq } = vi.hoisted(() => {
  const rowsHolder = { rows: [] as unknown[] };
  const mockEq = vi.fn(() => Promise.resolve({ data: rowsHolder.rows, error: null }));
  return { rowsHolder, mockEq };
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
});
