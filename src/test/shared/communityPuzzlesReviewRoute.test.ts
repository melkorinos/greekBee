// communityPuzzlesReviewRoute.test.ts
// Tests for PATCH /api/community-puzzles/leksiarxeio/[id]/review
// and      PATCH /api/community-puzzles/leksindeseis/[id]/review
//
// Both routes share identical auth + action logic; tested together.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

import { makeQueuedClient, tableShim } from "@/test/helpers/supabaseMock";

const _db = makeQueuedClient();

// Review handlers use the service-role client (RLS bypass); both resolve to the
// same queue-backed mock here.
vi.mock("@/lib/supabase", () => ({
  table:                tableShim,
  getSupabaseClient:    () => _db.client,
  getServiceRoleClient: () => _db.client,
}));

const enqueue = _db.enqueue;

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
  _db.reset();
  process.env.ADMIN_SECRET = CORRECT_SECRET;
});
afterEach(() => {
  _db.reset();
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
  it("approve → returns { ok: true } and the assigned release date", async () => {
    // Two results: the schedule read, then the update.
    enqueue({ data: [], error: null }, { data: null, error: null });
    const req = makePatchReq("leksiarxeio", "5", { action: "approve" }, CORRECT_SECRET);
    const res = await PATCH_LEKSIARXEIO(req, params("5"));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean; scheduled_date: string };
    expect(json.ok).toBe(true);
    expect(json.scheduled_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
    enqueue({ data: [], error: null }, { data: null, error: { message: "db fail" } });
    const req = makePatchReq("leksiarxeio", "5", { action: "approve" }, CORRECT_SECRET);
    const res = await PATCH_LEKSIARXEIO(req, params("5"));
    expect(res.status).toBe(500);
  });
});

// ── Leksindeseis — approve / reject ──────────────────────────────────────────

describe("PATCH /api/community-puzzles/leksindeseis/[id]/review", () => {
  it("approve → returns { ok: true }", async () => {
    enqueue({ data: [], error: null }, { data: null, error: null });
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
