// communityPuzzlesReviewRoute.test.ts
// Tests for PATCH /api/community-puzzles/leksiarxeio/[id]/review
// and      PATCH /api/community-puzzles/leksindeseis/[id]/review
//
// Both routes share identical auth + action logic; tested together.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

type ChainResult = { data?: unknown; error?: { message: string } | null };

let _callQueue: ChainResult[] = [];

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.update = ret;
  chain.delete = ret;
  chain.eq     = () => Promise.resolve(result);
  chain.then   = (resolve: (v: ChainResult) => void) => resolve(result);
  return chain;
}

vi.mock("@/lib/supabase", () => {
  const client = {
    from: () => {
      const result = _callQueue.shift() ?? { data: null, error: null };
      return makeChain(result);
    },
  };
  // Review handlers use the service-role client (RLS bypass); both resolve to the
  // same queue-backed mock here.
  return {
  table: (c: { from: (n: string) => unknown }, n: string) => c.from(n),
    getSupabaseClient:    () => client,
    getServiceRoleClient: () => client,
  };
});

function enqueue(...results: ChainResult[]) {
  _callQueue.push(...results);
}

// ── Route handlers ────────────────────────────────────────────────────────────

const { PATCH: PATCH_LEKSIARXEIO } = await import(
  "@/app/api/community-puzzles/leksiarxeio/[id]/review/route"
);
const { PATCH: PATCH_LEKSINDESEIS } = await import(
  "@/app/api/community-puzzles/leksindeseis/[id]/review/route"
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const CORRECT_SECRET = "test-secret";

function makePatchReq(
  game: "leksiarxeio" | "leksindeseis",
  id: string,
  body: unknown,
  secret?: string,
): NextRequest {
  const url = `http://localhost/api/community-puzzles/${game}/${id}/review`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret !== undefined) headers["X-Admin-Secret"] = secret;
  return new NextRequest(url, { method: "PATCH", headers, body: JSON.stringify(body) });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  _callQueue = [];
  process.env.ADMIN_SECRET = CORRECT_SECRET;
});
afterEach(() => {
  _callQueue = [];
  delete process.env.ADMIN_SECRET;
});

// ── Auth tests (same for both routes) ────────────────────────────────────────

describe("PATCH review — auth", () => {
  it("returns 401 with no X-Admin-Secret header", async () => {
    const req = makePatchReq("leksiarxeio", "1", { action: "approve" });
    const res = await PATCH_LEKSIARXEIO(req, params("1"));
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const req = makePatchReq("leksiarxeio", "1", { action: "approve" }, "wrong");
    const res = await PATCH_LEKSIARXEIO(req, params("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest(
      "http://localhost/api/community-puzzles/leksiarxeio/1/review",
      { method: "PATCH", headers: { "X-Admin-Secret": CORRECT_SECRET }, body: "not-json{{" },
    );
    const res = await PATCH_LEKSIARXEIO(req, params("1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown action", async () => {
    const req = makePatchReq("leksiarxeio", "1", { action: "suspend" }, CORRECT_SECRET);
    const res = await PATCH_LEKSIARXEIO(req, params("1"));
    expect(res.status).toBe(400);
  });
});

// ── Leksiarxeio — approve ────────────────────────────────────────────────────

describe("PATCH /api/community-puzzles/leksiarxeio/[id]/review", () => {
  it("approve → returns { ok: true }", async () => {
    enqueue({ data: null, error: null });
    const req = makePatchReq("leksiarxeio", "5", { action: "approve" }, CORRECT_SECRET);
    const res = await PATCH_LEKSIARXEIO(req, params("5"));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("reject → returns { ok: true }", async () => {
    enqueue({ data: null, error: null });
    const req = makePatchReq("leksiarxeio", "5", { action: "reject" }, CORRECT_SECRET);
    const res = await PATCH_LEKSIARXEIO(req, params("5"));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("approve → returns 500 on DB error", async () => {
    enqueue({ data: null, error: { message: "db fail" } });
    const req = makePatchReq("leksiarxeio", "5", { action: "approve" }, CORRECT_SECRET);
    const res = await PATCH_LEKSIARXEIO(req, params("5"));
    expect(res.status).toBe(500);
  });
});

// ── Leksindeseis — approve / reject ──────────────────────────────────────────

describe("PATCH /api/community-puzzles/leksindeseis/[id]/review", () => {
  it("approve → returns { ok: true }", async () => {
    enqueue({ data: null, error: null });
    const req = makePatchReq("leksindeseis", "7", { action: "approve" }, CORRECT_SECRET);
    const res = await PATCH_LEKSINDESEIS(req, params("7"));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("reject → returns { ok: true }", async () => {
    enqueue({ data: null, error: null });
    const req = makePatchReq("leksindeseis", "7", { action: "reject" }, CORRECT_SECRET);
    const res = await PATCH_LEKSINDESEIS(req, params("7"));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("returns 401 with wrong secret", async () => {
    const req = makePatchReq("leksindeseis", "7", { action: "approve" }, "bad");
    const res = await PATCH_LEKSINDESEIS(req, params("7"));
    expect(res.status).toBe(401);
  });
});
