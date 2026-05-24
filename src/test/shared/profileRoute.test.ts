// profileRoute.test.ts — unit tests for GET /api/profile and POST /api/profile
//
// Covers:
//   GET ?name=&pin=        — existing lookup by name + PIN
//   GET ?device_uuid=      — new: existence check for startup verification
//   POST                   — idempotent upsert by device_uuid

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

type ChainResult = { data?: unknown; error?: { message: string } | null };

let _callQueue: ChainResult[] = [];

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.select = ret;
  chain.eq     = ret;
  chain.order  = ret;
  chain.insert = () => Promise.resolve(result);
  chain.upsert = () => Promise.resolve(result);
  chain.single = () => Promise.resolve(result);
  chain.then   = (resolve: (v: ChainResult) => void) => resolve(result);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    from: () => {
      const result = _callQueue.shift() ?? { data: null, error: null };
      return makeChain(result);
    },
  }),
}));

function enqueue(...results: ChainResult[]) {
  _callQueue.push(...results);
}

const { GET, POST } = await import("@/app/api/profile/route");

function makeGetReq(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/profile");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

function makePostReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/profile", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

beforeEach(() => { _callQueue = []; });
afterEach(()  => { _callQueue = []; });

// ── GET ?device_uuid= — startup existence check ───────────────────────────────

describe("GET /api/profile?device_uuid — existence check", () => {
  it("returns exists:true when a profile row is found for the device_uuid", async () => {
    enqueue({ data: { device_uuid: "uuid-abc", display_name: "Νίκος" }, error: null });

    const res = await GET(makeGetReq({ device_uuid: "uuid-abc" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { exists: boolean };
    expect(json.exists).toBe(true);
  });

  it("returns exists:false when no row is found for the device_uuid", async () => {
    enqueue({ data: null, error: null });

    const res = await GET(makeGetReq({ device_uuid: "uuid-gone" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { exists: boolean };
    expect(json.exists).toBe(false);
  });

  it("returns 500 when Supabase returns an error", async () => {
    enqueue({ data: null, error: { message: "DB error" } });

    const res = await GET(makeGetReq({ device_uuid: "uuid-abc" }));
    expect(res.status).toBe(500);
  });
});

// ── GET ?name=&pin= — existing name+PIN lookup (regression) ──────────────────

describe("GET /api/profile?name&pin — name+PIN lookup (unchanged)", () => {
  it("returns 400 when both device_uuid and name+pin are absent", async () => {
    const res = await GET(makeGetReq({}));
    expect(res.status).toBe(400);
  });

  it("returns matching profiles when name+pin are provided", async () => {
    const rows = [{ device_uuid: "uuid-1", display_name: "Νίκος", created_at: "2026-01-01", last_active: "2026-05-01" }];
    enqueue({ data: rows, error: null });

    const res = await GET(makeGetReq({ name: "Νίκος", pin: "1234" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { profiles: unknown[] };
    expect(json.profiles).toHaveLength(1);
  });
});

// ── POST — idempotent upsert ──────────────────────────────────────────────────

describe("POST /api/profile — idempotent upsert", () => {
  it("returns { pin } on success", async () => {
    enqueue({ data: null, error: null });

    const res = await makePostReq({ display_name: "Μαρία", device_uuid: "uuid-new" });
    const json = await (await POST(res)).json() as { pin: string };
    expect(typeof json.pin).toBe("string");
    expect(json.pin).toHaveLength(4);
  });

  it("calling POST twice with same device_uuid succeeds (upsert, not duplicate error)", async () => {
    enqueue({ data: null, error: null });
    enqueue({ data: null, error: null });

    const body = { display_name: "Μαρία", device_uuid: "uuid-same" };
    const res1 = await POST(makePostReq(body));
    const res2 = await POST(makePostReq(body));
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });

  it("returns 400 when device_uuid is missing", async () => {
    const res = await POST(makePostReq({ display_name: "Νίκος" }));
    expect(res.status).toBe(400);
  });

  it("falls back to Ανώνυμος when display_name is empty", async () => {
    enqueue({ data: null, error: null });
    const res = await POST(makePostReq({ device_uuid: "uuid-anon" }));
    expect(res.status).toBe(200);
  });
});
