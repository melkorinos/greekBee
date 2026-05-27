// transferRoute.test.ts — unit tests for POST /api/transfer and POST /api/transfer/claim
//
// Covers:
//   POST /api/transfer          — generate a transfer code (6-char, stored in transfer_codes)
//   POST /api/transfer/claim    — validate code, mark used, return device_uuid + display_name

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
  chain.update = ret;
  chain.insert = () => Promise.resolve(result);
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

const { POST: generateCode } = await import("@/app/api/transfer/route");
const { POST: claimCode }    = await import("@/app/api/transfer/claim/route");

function makeReq(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

beforeEach(() => { _callQueue = []; });
afterEach(()  => { _callQueue = []; });

// ── POST /api/transfer — generate ────────────────────────────────────────────

describe("POST /api/transfer — generate transfer code", () => {
  it("returns a 6-char alphanumeric code on success", async () => {
    enqueue({ data: null, error: null });
    const res  = await generateCode(makeReq("http://localhost/api/transfer", { device_uuid: "uuid-abc" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { code: string };
    expect(json.code).toMatch(/^[A-Z2-9]{6}$/);
  });

  it("returns 400 when device_uuid is missing", async () => {
    const res = await generateCode(makeReq("http://localhost/api/transfer", {}));
    expect(res.status).toBe(400);
  });

  it("returns 500 when Supabase insert fails", async () => {
    enqueue({ data: null, error: { message: "DB error" } });
    const res = await generateCode(makeReq("http://localhost/api/transfer", { device_uuid: "uuid-abc" }));
    expect(res.status).toBe(500);
  });
});

// ── POST /api/transfer/claim — claim ─────────────────────────────────────────

describe("POST /api/transfer/claim — claim transfer code", () => {
  const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h from now
  const PAST   = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago

  it("returns device_uuid + display_name on a valid unused code", async () => {
    // 1st call: lookup transfer_codes row
    enqueue({ data: { device_uuid: "uuid-src", expires_at: FUTURE, used: false }, error: null });
    // 2nd call: update (mark used)
    enqueue({ data: null, error: null });
    // 3rd call: fetch player_profiles
    enqueue({ data: { display_name: "Νίκος" }, error: null });

    const res  = await claimCode(makeReq("http://localhost/api/transfer/claim", { code: "ABCDEF" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { device_uuid: string; display_name: string };
    expect(json.device_uuid).toBe("uuid-src");
    expect(json.display_name).toBe("Νίκος");
  });

  it("returns empty display_name when no profile row exists for the source device", async () => {
    enqueue({ data: { device_uuid: "uuid-src", expires_at: FUTURE, used: false }, error: null });
    enqueue({ data: null, error: null }); // mark used
    enqueue({ data: null, error: null }); // no profile found

    const res  = await claimCode(makeReq("http://localhost/api/transfer/claim", { code: "ABCDEF" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { display_name: string };
    expect(json.display_name).toBe("");
  });

  it("returns 404 when code is not found", async () => {
    enqueue({ data: null, error: { message: "not found" } });
    const res = await claimCode(makeReq("http://localhost/api/transfer/claim", { code: "ZZZZZZ" }));
    expect(res.status).toBe(404);
  });

  it("returns 410 when code has already been used", async () => {
    enqueue({ data: { device_uuid: "uuid-src", expires_at: FUTURE, used: true }, error: null });
    const res = await claimCode(makeReq("http://localhost/api/transfer/claim", { code: "ABCDEF" }));
    expect(res.status).toBe(410);
  });

  it("returns 410 when code has expired", async () => {
    enqueue({ data: { device_uuid: "uuid-src", expires_at: PAST, used: false }, error: null });
    const res = await claimCode(makeReq("http://localhost/api/transfer/claim", { code: "ABCDEF" }));
    expect(res.status).toBe(410);
  });

  it("returns 400 when code is missing from request body", async () => {
    const res = await claimCode(makeReq("http://localhost/api/transfer/claim", {}));
    expect(res.status).toBe(400);
  });

  it("normalises code to uppercase before lookup", async () => {
    enqueue({ data: { device_uuid: "uuid-src", expires_at: FUTURE, used: false }, error: null });
    enqueue({ data: null, error: null });
    enqueue({ data: { display_name: "Μαρία" }, error: null });

    const res = await claimCode(makeReq("http://localhost/api/transfer/claim", { code: "abcdef" }));
    expect(res.status).toBe(200);
  });
});
