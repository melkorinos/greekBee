// profileRoute.test.ts — unit tests for GET /api/profile and POST /api/profile
//
// Covers:
//   GET ?device_uuid=      — existence check for startup verification
//   POST                   — idempotent upsert by device_uuid

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

import { makeQueuedClient, tableShim } from "@/test/helpers/supabaseMock";

let _lastUpsertPayload: unknown = null;
let _lastUpdatePayload: unknown = null;

const _db = makeQueuedClient({
  onCall: ({ op, args }) => {
    if (op === "upsert") _lastUpsertPayload = args[0];
    if (op === "update") _lastUpdatePayload = args[0];
  },
});

const hoisted = vi.hoisted(() => ({ tokens: [] as string[] }));

vi.mock("@/lib/supabase", () => ({
  table: tableShim,
  getSupabaseClient:    () => _db.client,
  getTokenScopedClient: (token: string) => { hoisted.tokens.push(token); return _db.client; },
}));

const enqueue = _db.enqueue;

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

beforeEach(() => { _db.reset(); _lastUpsertPayload = null; _lastUpdatePayload = null; hoisted.tokens = []; });
afterEach(()  => { _db.reset(); _lastUpsertPayload = null; _lastUpdatePayload = null; hoisted.tokens = []; });

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

  it("returns 400 when device_uuid is absent", async () => {
    const res = await GET(makeGetReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 500 when Supabase returns an error", async () => {
    enqueue({ data: null, error: { message: "DB error" } });

    const res = await GET(makeGetReq({ device_uuid: "uuid-abc" }));
    expect(res.status).toBe(500);
  });
});

// ── POST — idempotent upsert ──────────────────────────────────────────────────

describe("POST /api/profile — idempotent upsert", () => {
  it("returns { ok: true } on success", async () => {
    enqueue({ data: null, error: null });

    const res = await POST(makePostReq({ display_name: "Μαρία", device_uuid: "uuid-new" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
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

  it("includes last_active as a valid ISO timestamp in the upsert payload", async () => {
    enqueue({ data: null, error: null });
    await POST(makePostReq({ display_name: "Νίκος", device_uuid: "uuid-abc" }));
    const payload = _lastUpsertPayload as Record<string, unknown>;
    expect(typeof payload.last_active).toBe("string");
    expect(new Date(payload.last_active as string).getTime()).not.toBeNaN();
  });

  // The rename used to fan out to every game_scores row of the device. It no
  // longer does: the leaderboard GET resolves names from player_profiles at read
  // time, so the profile upsert IS the rename. Asserting the absence matters —
  // reinstating the fan-out would silently restore the write amplification it
  // cost (one rename rewriting every historical row for that device).
  it("does not fan the rename out to game_scores", async () => {
    enqueue({ data: null, error: null }); // player_profiles upsert — the only write
    const res = await POST(makePostReq({ display_name: "Μαρία", device_uuid: "uuid-x" }));
    expect(res.status).toBe(200);
    expect(_lastUpsertPayload).toMatchObject({ display_name: "Μαρία", device_uuid: "uuid-x" });
    expect(_lastUpdatePayload).toBeNull();
  });

  // A signed-in player's row is auth.uid()-scoped by RLS (profile_update), so the
  // write must go through the token-scoped client — the anon client would hit
  // "new row violates row-level security policy" on an auth-linked row.
  it("routes the write through the token-scoped client when a Bearer token is present", async () => {
    enqueue({ data: null, error: null }); // profile upsert
    const req = new NextRequest("http://localhost/api/profile", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok-123" },
      body:    JSON.stringify({ display_name: "Μαρία", device_uuid: "uuid-auth" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(hoisted.tokens).toContain("tok-123");
  });

  it("uses the anon client (no token captured) when no Authorization header is present", async () => {
    enqueue({ data: null, error: null });
    await POST(makePostReq({ display_name: "Μαρία", device_uuid: "uuid-anon" }));
    expect(hoisted.tokens).toHaveLength(0);
  });
});
