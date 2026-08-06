// profileStatsRoute.test.ts — GET /api/profile/stats.
//
// Read-only lifetime stats for one device: total points and puzzles played
// (cross-game), plus leksokipos_points (leksokipos-only) from the game_scores
// aggregate, and the per-kind milestone counts that feed badge progress.
//
// The standalone player_pangrams COUNT(*) this route used to run is now one
// GROUP BY kind (player_milestone_counts), so two more badges gain live progress
// values while the route's query count stays flat — which matters on a hot route.
// Supabase is mocked; the pure reduce itself is covered by lifetimeStats.test.ts.

import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { holder, mockScoresEq, mockRpc, mockLt } = vi.hoisted(() => {
  const holder = {
    rows: [] as unknown[],
    counts: [] as unknown[],
    scoresError: null as { message: string } | null,
    countsError: null as { message: string } | null,
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
  // player_milestone_counts: one aggregate row per kind, no row data transferred.
  const mockRpc = vi.fn(() => Promise.resolve({ data: holder.counts, error: holder.countsError }));
  return { holder, mockScoresEq, mockRpc, mockLt };
});

vi.mock("@/lib/supabase", () => ({
  table: (c: { from: (n: string) => unknown }, n: string) => c.from(n),
  getSupabaseClient: () => ({
    from: () => ({ select: () => ({ eq: mockScoresEq }) }),
    rpc:  mockRpc,
  }),
}));

import { GET } from "@/app/api/profile/stats/route";

function req(query: string) {
  return new NextRequest(`http://localhost/api/profile/stats${query}`);
}

function reset() {
  holder.rows = [];
  holder.counts = [];
  holder.scoresError = null;
  holder.countsError = null;
  mockScoresEq.mockClear();
  mockRpc.mockClear();
  mockLt.mockClear();
}

describe("GET /api/profile/stats", () => {
  it("returns 400 when device_uuid is missing", async () => {
    reset();
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });

  it("returns aggregated scores plus a count per milestone kind", async () => {
    reset();
    holder.rows = [
      { game_id: "leksokipos",  score: 120 },
      { game_id: "leksiarxeio", score: 30  },
    ];
    holder.counts = [
      { kind: "pangram",  count: 7 },
      { kind: "top_rank", count: 3 },
      { kind: "tzimani",  count: 1 },
      { kind: "word",     count: 12 },
    ];
    const res = await GET(req("?device_uuid=dev-A"));
    expect(res.status).toBe(200);
    expect(mockScoresEq).toHaveBeenCalledWith("device_id", "dev-A");
    expect(mockRpc).toHaveBeenCalledWith("player_milestone_counts", { p_device_uuid: "dev-A" });
    expect(await res.json()).toEqual({
      total_points: 150, puzzles_played: 2, leksokipos_points: 120,
      pangram_count: 7, top_rank_count: 3, tzimani_count: 1,
    });
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=60");
  });

  it("reports every badge-bearing kind as 0 when the device has no milestones", async () => {
    reset();
    holder.rows = [{ game_id: "leksokipos", score: 40 }];
    holder.counts = [];
    expect(await (await GET(req("?device_uuid=dev-A"))).json()).toMatchObject({
      pangram_count: 0, top_rank_count: 0, tzimani_count: 0,
    });
  });

  it("keeps one kind's absence from hiding another's count", async () => {
    reset();
    holder.counts = [{ kind: "tzimani", count: 4 }];
    expect(await (await GET(req("?device_uuid=dev-A"))).json()).toMatchObject({
      pangram_count: 0, top_rank_count: 0, tzimani_count: 4,
    });
  });

  it("does not surface the word count — the per-length card is its only reader", async () => {
    reset();
    holder.counts = [{ kind: "word", count: 12 }];
    expect(await (await GET(req("?device_uuid=dev-A"))).json()).not.toHaveProperty("word_count");
  });

  it("runs exactly one milestone query, whatever the kind count", async () => {
    // The whole point of the GROUP BY: adding badge-bearing kinds must not add
    // round-trips to a route the profile page hits on every load.
    reset();
    holder.counts = [
      { kind: "pangram", count: 1 }, { kind: "word", count: 2 },
      { kind: "top_rank", count: 3 }, { kind: "tzimani", count: 4 },
    ];
    await GET(req("?device_uuid=dev-A"));
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it("500 when the game_scores aggregate query errors", async () => {
    reset();
    holder.scoresError = { message: "scores fetch failed" };
    const res = await GET(req("?device_uuid=dev-A"));
    expect(res.status).toBe(500);
  });

  it("500 when the milestone aggregate errors", async () => {
    reset();
    holder.countsError = { message: "aggregate failed" };
    const res = await GET(req("?device_uuid=dev-A"));
    expect(res.status).toBe(500);
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
});
