// authLinkRoute.test.ts — unit tests for POST /api/auth/link.
// Supabase is mocked; no real network calls are made.
//
// The route makes 3 sequential DB calls per request:
//   1. player_profiles.select().eq().maybeSingle()  — check for existing name
//   2. player_profiles.upsert()                     — set auth_user_id + display_name
//   3. game_scores.update().eq().is()               — back-fill auth_user_id (non-fatal)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

type ChainResult = { data?: unknown; error?: { message: string } | null };

let _callQueue: ChainResult[] = [];

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.select      = ret;
  chain.eq          = ret;
  chain.update      = ret;
  chain.is          = ret;
  chain.upsert      = () => Promise.resolve(result);
  chain.maybeSingle = () => Promise.resolve(result);
  chain.then        = (resolve: (v: ChainResult) => void) => resolve(result);
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

const { POST } = await import("@/app/api/auth/link/route");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePostReq(body: unknown) {
  return new NextRequest("http://localhost/api/auth/link", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

function enqueue(...results: ChainResult[]) { _callQueue.push(...results); }

beforeEach(() => { _callQueue = []; });
afterEach(()  => { _callQueue = []; });

const BASE = { device_uuid: "d1", auth_user_id: "auth-abc", display_name: "Γιώργος" };

// ── Validation ────────────────────────────────────────────────────────────────

describe("POST /api/auth/link — validation", () => {
  it("400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/auth/link", {
      method: "POST", body: "{bad", headers: { "Content-Type": "application/json" },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("400 when device_uuid is missing", async () => {
    expect((await POST(makePostReq({ auth_user_id: "a1" }))).status).toBe(400);
  });

  it("400 when auth_user_id is missing", async () => {
    expect((await POST(makePostReq({ device_uuid: "d1" }))).status).toBe(400);
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe("POST /api/auth/link — happy path", () => {
  it("200 ok — first link for a device with no existing profile", async () => {
    enqueue({ data: null,  error: null }); // no existing profile
    enqueue({ data: null,  error: null }); // upsert profile
    enqueue({ data: null,  error: null }); // back-fill scores
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("200 ok — idempotent re-link for already-linked device", async () => {
    enqueue({ data: { display_name: "Γιώργος" }, error: null }); // existing profile
    enqueue({ data: null, error: null });                          // upsert (no-op conflict)
    enqueue({ data: null, error: null });                          // back-fill (no rows match)
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
  });

  it("uses Google display_name when player has no name yet", async () => {
    enqueue({ data: null, error: null }); // no profile → Google name used
    enqueue({ data: null, error: null });
    enqueue({ data: null, error: null });
    const res = await POST(makePostReq({ ...BASE, display_name: "GoogleName" }));
    expect(res.status).toBe(200);
  });

  it("falls back to Ανώνυμος when display_name is null and no existing profile", async () => {
    enqueue({ data: null, error: null });
    enqueue({ data: null, error: null });
    enqueue({ data: null, error: null });
    const res = await POST(makePostReq({ device_uuid: "d1", auth_user_id: "a1", display_name: null }));
    expect(res.status).toBe(200);
  });
});

// ── Error paths ───────────────────────────────────────────────────────────────

describe("POST /api/auth/link — error paths", () => {
  it("500 when profile upsert fails", async () => {
    enqueue({ data: null, error: null });                   // profile fetch ok
    enqueue({ error: { message: "upsert failed" } });       // upsert → error
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(500);
  });

  it("still 200 when game_scores back-fill fails (non-fatal)", async () => {
    enqueue({ data: null, error: null });                   // profile fetch
    enqueue({ data: null, error: null });                   // profile upsert ok
    enqueue({ error: { message: "scores error" } });        // back-fill → error (non-fatal)
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
  });
});
