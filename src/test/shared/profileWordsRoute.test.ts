// profileWordsRoute.test.ts — unit tests for GET /api/profile/words.
//
// Supabase is mocked; no real network. The read aggregates in Postgres via the
// player_milestones_by_length RPC (one { length, count } row per distinct length
// the device found, over the kind='word' rows — zero data rows transferred, so it
// scales as milestones accumulate). The route folds that into the display buckets
// (bucketWordsByLength, covered in wordsByLength.test.ts) and returns { total,
// buckets }. Missing device_uuid → 400; RPC error → 500.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type RpcResult = { data?: unknown; error?: { message: string } | null };

let _rpc: { fn: string; params: unknown } | null = null;
let _rpcResult: RpcResult = { data: [], error: null };

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    rpc: (fn: string, params: unknown) => {
      _rpc = { fn, params };
      return Promise.resolve(_rpcResult);
    },
  }),
}));

const { GET } = await import("@/app/api/profile/words/route");

function makeGetReq(query: string) {
  return new NextRequest(`http://localhost/api/profile/words${query}`);
}

beforeEach(() => { _rpc = null; _rpcResult = { data: [], error: null }; });
afterEach(()  => { _rpc = null; _rpcResult = { data: [], error: null }; });

describe("GET /api/profile/words", () => {
  it("aggregates via the RPC and returns bucketed per-length counts", async () => {
    _rpcResult = { data: [{ length: 10, count: 10 }, { length: 11, count: 3 }, { length: 15, count: 2 }], error: null };
    const res = await GET(makeGetReq("?device_uuid=device-1"));
    expect(res.status).toBe(200);

    // The RPC is called with the device as its parameter (invoker-rights, RLS-scoped).
    expect(_rpc?.fn).toBe("player_milestones_by_length");
    expect(_rpc?.params).toEqual({ p_device_uuid: "device-1" });

    const body = await res.json();
    expect(body.total).toBe(15);
    const byKey = Object.fromEntries(body.buckets.map((b: { key: string; count: number }) => [b.key, b.count]));
    expect(byKey["10"]).toBe(10);
    expect(byKey["11"]).toBe(3);
    expect(byKey["13+"]).toBe(2); // 15 folds into the tail
  });

  it("returns an all-zero shape when the device has found nothing", async () => {
    _rpcResult = { data: [], error: null };
    const res = await GET(makeGetReq("?device_uuid=device-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.buckets.every((b: { count: number }) => b.count === 0)).toBe(true);
  });

  it("400 when device_uuid is missing", async () => {
    const res = await GET(makeGetReq(""));
    expect(res.status).toBe(400);
    expect(_rpc).toBeNull();
  });

  it("500 when the RPC returns an error", async () => {
    _rpcResult = { data: null, error: { message: "rpc failed" } };
    const res = await GET(makeGetReq("?device_uuid=device-1"));
    expect(res.status).toBe(500);
  });
});
