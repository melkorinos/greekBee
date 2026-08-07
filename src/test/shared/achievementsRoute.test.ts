// achievementsRoute.test.ts — unit tests for POST/GET /api/achievements.
// Supabase is mocked; no real network calls are made. The earn path is
// insert-if-absent (ON CONFLICT DO NOTHING) so an earned badge is never clobbered.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

import { makeQueuedClient, tableShim } from "@/test/helpers/supabaseMock";

let _lastUpsert: { rows: unknown; options: unknown } | null = null;

const _db = makeQueuedClient({
  onCall: ({ op, args }) => {
    if (op === "upsert") _lastUpsert = { rows: args[0], options: args[1] };
  },
});

vi.mock("@/lib/supabase", () => ({
  table: tableShim,
  getSupabaseClient: () => _db.client,
}));

const { POST, GET } = await import("@/app/api/achievements/route");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePostReq(body: unknown) {
  return new NextRequest("http://localhost/api/achievements", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

function makeGetReq(params: Record<string, string>) {
  const url = new URL("http://localhost/api/achievements");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const enqueue = _db.enqueue;

beforeEach(() => { _db.reset(); _lastUpsert = null; });
afterEach(()  => { _db.reset(); _lastUpsert = null; });

const VALID_POST = {
  device_uuid:     "device-1",
  achievement_ids: ["leksokipos-tzimani-chalkino"],
};

// ── POST — happy path ─────────────────────────────────────────────────────────

describe("POST /api/achievements — happy path", () => {
  it("200 ok and insert-if-absent (ignoreDuplicates) on a valid earn", async () => {
    enqueue({ error: null });
    const res = await POST(makePostReq(VALID_POST));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    // Must use ON CONFLICT DO NOTHING so an already-earned badge's earned_at is preserved.
    expect(_lastUpsert?.options).toMatchObject({
      onConflict:      "device_uuid,achievement_id",
      ignoreDuplicates: true,
    });
    expect(_lastUpsert?.rows).toEqual([
      { device_uuid: "device-1", achievement_id: "leksokipos-tzimani-chalkino" },
    ]);
  });

  it("writes one row per distinct id, de-duped", async () => {
    enqueue({ error: null });
    const res = await POST(makePostReq({
      device_uuid:     "device-1",
      achievement_ids: ["leksokipos-tzimani-chalkino", "leksokipos-tzimani-chalkino", "leksokipos-stin-korifi-chalkino"],
    }));
    expect(res.status).toBe(200);
    expect(_lastUpsert?.rows).toEqual([
      { device_uuid: "device-1", achievement_id: "leksokipos-tzimani-chalkino" },
      { device_uuid: "device-1", achievement_id: "leksokipos-stin-korifi-chalkino" },
    ]);
  });
});

// ── POST — id whitelist ─────────────────────────────────────────────────────────

describe("POST /api/achievements — id whitelist", () => {
  it("drops unknown ids and only writes known ones", async () => {
    enqueue({ error: null });
    const res = await POST(makePostReq({
      device_uuid:     "device-1",
      achievement_ids: ["not-a-real-badge", "leksokipos-sidirodromos"],
    }));
    expect(res.status).toBe(200);
    expect(_lastUpsert?.rows).toEqual([
      { device_uuid: "device-1", achievement_id: "leksokipos-sidirodromos" },
    ]);
  });

  it("no-ops (200, no DB write) when every id is unknown", async () => {
    const res = await POST(makePostReq({
      device_uuid:     "device-1",
      achievement_ids: ["bogus", "also-bogus"],
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(_lastUpsert).toBeNull(); // never touched the table
  });
});

// ── POST — validation ───────────────────────────────────────────────────────────

describe("POST /api/achievements — validation", () => {
  it("400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/achievements", {
      method: "POST", body: "{bad", headers: { "Content-Type": "application/json" },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("400 when device_uuid is missing", async () => {
    const res = await POST(makePostReq({ ...VALID_POST, device_uuid: undefined }));
    expect(res.status).toBe(400);
  });

  it("400 when achievement_ids is not an array", async () => {
    const res = await POST(makePostReq({ device_uuid: "device-1", achievement_ids: "leksokipos-tzimani-chalkino" }));
    expect(res.status).toBe(400);
  });

  it("500 when the DB upsert returns an error", async () => {
    enqueue({ error: { message: "DB failure" } });
    const res = await POST(makePostReq(VALID_POST));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});

// ── GET — earned ids ────────────────────────────────────────────────────────────

describe("GET /api/achievements", () => {
  it("400 when device_uuid is missing", async () => {
    const res = await GET(makeGetReq({}));
    expect(res.status).toBe(400);
  });

  it("returns the device's earned achievement_ids", async () => {
    enqueue({ data: [
      { achievement_id: "leksokipos-tzimani-chalkino" },
      { achievement_id: "leksokipos-stin-korifi-chalkino" },
    ], error: null });
    const res = await GET(makeGetReq({ device_uuid: "device-1" }));
    expect(res.status).toBe(200);
    expect((await res.json()).earned).toEqual(["leksokipos-tzimani-chalkino", "leksokipos-stin-korifi-chalkino"]);
  });

  it("returns an empty list when the device has earned nothing", async () => {
    enqueue({ data: [], error: null });
    const res = await GET(makeGetReq({ device_uuid: "device-1" }));
    expect(res.status).toBe(200);
    expect((await res.json()).earned).toEqual([]);
  });

  it("500 on unexpected DB error", async () => {
    enqueue({ data: null, error: { message: "connection refused" } });
    const res = await GET(makeGetReq({ device_uuid: "device-1" }));
    expect(res.status).toBe(500);
  });
});
