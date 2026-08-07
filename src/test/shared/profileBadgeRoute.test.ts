// profileBadgeRoute.test.ts — unit tests for POST/GET /api/profile/badge.
//
// The badge-selection endpoint (Handoff B). Supabase is mocked; no real network.
// The write validates server-side that the id is a real catalog badge AND that
// the device holds an earned player_achievements row for it (any tier id counts),
// stores the BASE id, lazily creates the profile row on first pick, and clears on
// null. Uses the service-role client (ownership is enforced in code, not RLS).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

import { makeQueuedClient, tableShim } from "@/test/helpers/supabaseMock";

let _lastUpdate: unknown = null;
let _lastInsert: unknown = null;

const _db = makeQueuedClient({
  onCall: ({ op, args }) => {
    if (op === "update") _lastUpdate = args[0];
    if (op === "insert") _lastInsert = args[0];
  },
});

vi.mock("@/lib/supabase", () => ({
  table: tableShim,
  getServiceRoleClient: () => _db.client,
}));

const { POST, GET } = await import("@/app/api/profile/badge/route");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePostReq(body: unknown) {
  return new NextRequest("http://localhost/api/profile/badge", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

function makeGetReq(params: Record<string, string>) {
  const url = new URL("http://localhost/api/profile/badge");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const enqueue = _db.enqueue;

beforeEach(() => { _db.reset(); _lastUpdate = null; _lastInsert = null; });
afterEach(()  => { _db.reset(); _lastUpdate = null; _lastInsert = null; });

// Two different catalog badges. Both are tiered because after TICKET-02 every
// catalog entry is — the route's contract is about ownership and storage shape,
// not about the badge's kind.
const OTHER  = "leksokipos-stin-korifi";
const TIERED = "leksokipos-kynigos-pangram";

// ── POST — valid selection saved ──────────────────────────────────────────────

describe("POST /api/profile/badge — valid selection", () => {
  it("saves a badge the device owns onto an existing profile row", async () => {
    enqueue(
      { data: [{ id: 1 }], error: null }, // ownership check — earned
      { data: [{ id: 7 }], error: null }, // update — a row existed
    );
    const res = await POST(makePostReq({ device_uuid: "dev-1", selected_badge_id: OTHER }));
    expect(res.status).toBe(200);
    expect(_lastUpdate).toMatchObject({ selected_badge_id: OTHER });
    expect(_lastInsert).toBeNull(); // updated in place, no lazy insert
  });

  it("saves the BASE id for a tiered badge the device owns via any tier", async () => {
    enqueue(
      { data: [{ id: 3 }], error: null }, // ownership — holds some tier
      { data: [{ id: 7 }], error: null }, // update
    );
    const res = await POST(makePostReq({ device_uuid: "dev-1", selected_badge_id: TIERED }));
    expect(res.status).toBe(200);
    expect(_lastUpdate).toMatchObject({ selected_badge_id: TIERED });
  });
});

// ── POST — ownership + whitelist rejection ────────────────────────────────────

describe("POST /api/profile/badge — rejection", () => {
  it("rejects an id the device has not earned (no fake prestige)", async () => {
    enqueue({ data: [], error: null }); // ownership — nothing earned
    const res = await POST(makePostReq({ device_uuid: "dev-1", selected_badge_id: OTHER }));
    expect(res.status).toBe(403);
    expect(_lastUpdate).toBeNull();
  });

  it("rejects an unknown badge id without touching the DB", async () => {
    const res = await POST(makePostReq({ device_uuid: "dev-1", selected_badge_id: "not-a-badge" }));
    expect(res.status).toBe(400);
    expect(_lastUpdate).toBeNull();
  });

  it("rejects a per-tier id (only base ids are selectable)", async () => {
    const res = await POST(makePostReq({
      device_uuid: "dev-1", selected_badge_id: "leksokipos-kynigos-pangram-chryso",
    }));
    expect(res.status).toBe(400);
    expect(_lastUpdate).toBeNull();
  });
});

// ── POST — clearing ───────────────────────────────────────────────────────────

describe("POST /api/profile/badge — clearing", () => {
  it("null clears the selection without an ownership check", async () => {
    enqueue({ data: [{ id: 7 }], error: null }); // update only
    const res = await POST(makePostReq({ device_uuid: "dev-1", selected_badge_id: null }));
    expect(res.status).toBe(200);
    expect(_lastUpdate).toMatchObject({ selected_badge_id: null });
    expect(_lastInsert).toBeNull();
  });

  it("clearing when no profile row exists is a no-op (no lazy insert of a null badge)", async () => {
    enqueue({ data: [], error: null }); // update matched nothing
    const res = await POST(makePostReq({ device_uuid: "dev-1", selected_badge_id: null }));
    expect(res.status).toBe(200);
    expect(_lastInsert).toBeNull();
  });
});

// ── POST — lazy profile creation ──────────────────────────────────────────────

describe("POST /api/profile/badge — lazy profile creation", () => {
  it("upserts a fresh profile row when the player first picks a badge", async () => {
    enqueue(
      { data: [{ id: 1 }], error: null }, // ownership — earned
      { data: [], error: null },          // update — no row yet
      { data: null, error: null },        // insert — ok
    );
    const res = await POST(makePostReq({ device_uuid: "dev-new", selected_badge_id: OTHER }));
    expect(res.status).toBe(200);
    expect(_lastInsert).toMatchObject({ device_uuid: "dev-new", selected_badge_id: OTHER });
    // display_name is NOT NULL — the lazy row must carry a default name.
    expect((_lastInsert as { display_name?: string }).display_name).toBeTruthy();
  });
});

// ── POST — validation ─────────────────────────────────────────────────────────

describe("POST /api/profile/badge — validation", () => {
  it("400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/profile/badge", {
      method: "POST", body: "{bad", headers: { "Content-Type": "application/json" },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("400 when device_uuid is missing", async () => {
    const res = await POST(makePostReq({ selected_badge_id: OTHER }));
    expect(res.status).toBe(400);
  });

  it("400 when selected_badge_id is absent (null is required to clear)", async () => {
    const res = await POST(makePostReq({ device_uuid: "dev-1" }));
    expect(res.status).toBe(400);
  });

  it("500 when the DB update returns an error", async () => {
    enqueue(
      { data: [{ id: 1 }], error: null },        // ownership
      { data: null, error: { message: "boom" } }, // update fails
    );
    const res = await POST(makePostReq({ device_uuid: "dev-1", selected_badge_id: OTHER }));
    expect(res.status).toBe(500);
  });
});

// ── GET — current selection ───────────────────────────────────────────────────

describe("GET /api/profile/badge", () => {
  it("400 when device_uuid is missing", async () => {
    const res = await GET(makeGetReq({}));
    expect(res.status).toBe(400);
  });

  it("returns the stored selected_badge_id", async () => {
    enqueue({ data: { selected_badge_id: TIERED }, error: null });
    const res = await GET(makeGetReq({ device_uuid: "dev-1" }));
    expect(res.status).toBe(200);
    expect((await res.json()).selected_badge_id).toBe(TIERED);
  });

  it("returns null when the device has no profile row", async () => {
    enqueue({ data: null, error: null });
    const res = await GET(makeGetReq({ device_uuid: "dev-1" }));
    expect(res.status).toBe(200);
    expect((await res.json()).selected_badge_id).toBeNull();
  });
});
