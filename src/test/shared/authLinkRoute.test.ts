// authLinkRoute.test.ts — unit tests for POST /api/auth/link.
// Supabase is mocked; no real network calls are made.
//
// Security contract (ADR 0012 §6): the route derives auth_user_id from the
// verified Supabase JWT (Authorization: Bearer <access_token> → getUser(token)),
// never from the request body. The body supplies only device_uuid.
//
// Restore contract (ADR 0012): if the auth account already anchors a profile on
// a *different* device, the route performs Sign-in Restore — merges this
// device's game_scores into the adopted identity (best score per puzzle wins),
// deletes this device's old profile row, and returns the canonical device_uuid
// for the client to adopt. Otherwise it links this device (first sign-in).
//
// The harness is intent-aware: reads resolve from declared DB state (by table +
// filter); writes are recorded for assertion. Privileged writes go through the
// service-role client.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Types the mock understands ──────────────────────────────────────────────────

interface ScoreRow { id: number; game_id: string; puzzle_date: string; score: number }
interface Anchor   { device_uuid: string; display_name: string }

interface DbState {
  /** player_profiles row for the signed-in auth_user_id (the identity anchor). */
  anchorByAuth?:    Anchor | null;
  /** player_profiles display_name by device_uuid. */
  profileByDevice?: Record<string, { display_name: string }>;
  /** game_scores rows by device_id. */
  scoresByDevice?:  Record<string, ScoreRow[]>;
  failUpsert?:      boolean;
  failBackfill?:    boolean;
}

interface RecordedWrite {
  table:   string;
  op:      "upsert" | "update" | "delete";
  payload?: unknown;
  eqs:     [string, unknown][];
  ins:     [string, unknown[]][];
}

// ── Mutable per-test state ──────────────────────────────────────────────────────

let _db:      DbState = {};
let _writes:  RecordedWrite[] = [];
let _authUser: { id: string; user_metadata?: Record<string, unknown> } | null = null;
let _authError: { message: string } | null = null;

function eqVal(eqs: [string, unknown][], col: string): unknown {
  return eqs.find(([c]) => c === col)?.[1];
}

function resolveRead(table: string, eqs: [string, unknown][]) {
  if (table === "player_profiles") {
    if (eqVal(eqs, "auth_user_id") !== undefined) {
      return { data: _db.anchorByAuth ?? null, error: null };
    }
    const device = eqVal(eqs, "device_uuid") as string;
    return { data: _db.profileByDevice?.[device] ?? null, error: null };
  }
  if (table === "game_scores") {
    const device = eqVal(eqs, "device_id") as string;
    return { data: _db.scoresByDevice?.[device] ?? [], error: null };
  }
  return { data: null, error: null };
}

function resolveWrite(w: RecordedWrite) {
  if (w.table === "player_profiles" && w.op === "upsert" && _db.failUpsert) {
    return { data: null, error: { message: "upsert failed" } };
  }
  if (w.table === "game_scores" && w.op === "update" && eqVal(w.eqs, "device_id") !== undefined && _db.failBackfill) {
    return { data: null, error: { message: "scores error" } };
  }
  return { data: null, error: null };
}

function makeChain(table: string) {
  const st: RecordedWrite & { op: RecordedWrite["op"] | "select" } = {
    table, op: "select", eqs: [], ins: [],
  };
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.update = (p: unknown) => { st.op = "update"; st.payload = p; return chain; };
  chain.delete = () => { st.op = "delete"; return chain; };
  chain.eq = (c: string, v: unknown) => { st.eqs.push([c, v]); return chain; };
  chain.is = (c: string, v: unknown) => { st.eqs.push([c, v]); return chain; };
  chain.in = (c: string, v: unknown[]) => { st.ins.push([c, v]); return chain; };
  chain.upsert = (p: unknown) => {
    st.op = "upsert"; st.payload = p;
    _writes.push(st as RecordedWrite);
    return Promise.resolve(resolveWrite(st as RecordedWrite));
  };
  chain.maybeSingle = () => Promise.resolve(resolveRead(table, st.eqs));
  chain.single      = () => Promise.resolve(resolveRead(table, st.eqs));
  chain.then = (resolve: (v: unknown) => void) => {
    if (st.op === "select") return resolve(resolveRead(table, st.eqs));
    _writes.push(st as RecordedWrite);
    return resolve(resolveWrite(st as RecordedWrite));
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: _authUser }, error: _authError }),
    },
  }),
  getServiceRoleClient: () => ({
    from: (table: string) => makeChain(table),
  }),
}));

const { POST } = await import("@/app/api/auth/link/route");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePostReq(body: unknown, token: string | null = "valid-token") {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token !== null) headers["Authorization"] = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/auth/link", {
    method: "POST", headers, body: JSON.stringify(body),
  });
}

function signedInAs(id: string, fullName?: string) {
  _authUser  = { id, user_metadata: fullName ? { full_name: fullName } : {} };
  _authError = null;
}

function upsertOf(table: string) {
  return _writes.find((w) => w.table === table && w.op === "upsert");
}

beforeEach(() => { _db = {}; _writes = []; _authUser = null; _authError = null; });
afterEach(()  => { _db = {}; _writes = []; _authUser = null; _authError = null; });

const BASE = { device_uuid: "d1" };

// ── Security boundary ───────────────────────────────────────────────────────────

describe("POST /api/auth/link — security boundary", () => {
  it("401 when the Authorization header is missing", async () => {
    const res = await POST(makePostReq(BASE, null));
    expect(res.status).toBe(401);
  });

  it("401 when the token is invalid (getUser rejects it)", async () => {
    _authError = { message: "invalid JWT" };
    const res = await POST(makePostReq(BASE, "bad-token"));
    expect(res.status).toBe(401);
  });

  it("400 when device_uuid is missing, even with a valid token", async () => {
    signedInAs("auth-abc");
    const res = await POST(makePostReq({}, "valid-token"));
    expect(res.status).toBe(400);
  });

  it("derives auth_user_id from the verified token, ignoring the body", async () => {
    signedInAs("auth-from-token");
    const res = await POST(makePostReq({ device_uuid: "d1", auth_user_id: "attacker-id" }));
    expect(res.status).toBe(200);
    expect((upsertOf("player_profiles")?.payload as { auth_user_id: string }).auth_user_id)
      .toBe("auth-from-token");
  });
});

// ── Link mode (first sign-in / same device) ─────────────────────────────────────

describe("POST /api/auth/link — link mode", () => {
  it("links this device and reports restored:false", async () => {
    signedInAs("auth-abc", "Γιώργος");
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, device_uuid: "d1", restored: false });
  });

  it("uses the verified Google name when the player has no name yet", async () => {
    signedInAs("auth-abc", "Γιώργος");
    await POST(makePostReq(BASE));
    expect((upsertOf("player_profiles")?.payload as { display_name: string }).display_name)
      .toBe("Γιώργος");
  });

  it("keeps the existing display_name over the Google name", async () => {
    signedInAs("auth-abc", "GoogleName");
    _db.profileByDevice = { d1: { display_name: "ΠαιχτηςΧ" } };
    await POST(makePostReq(BASE));
    expect((upsertOf("player_profiles")?.payload as { display_name: string }).display_name)
      .toBe("ΠαιχτηςΧ");
  });

  it("falls back to Ανώνυμος with no existing name and no Google name", async () => {
    signedInAs("auth-abc");
    await POST(makePostReq(BASE));
    expect((upsertOf("player_profiles")?.payload as { display_name: string }).display_name)
      .toBe("Ανώνυμος");
  });

  it("back-fills auth_user_id filtering game_scores by device_id (not device_uuid)", async () => {
    signedInAs("auth-abc");
    await POST(makePostReq(BASE));
    const backfill = _writes.find(
      (w) => w.table === "game_scores" && w.op === "update" && eqVal(w.eqs, "device_id") !== undefined,
    );
    expect((backfill?.payload as { auth_user_id: string }).auth_user_id).toBe("auth-abc");
    expect(eqVal(backfill!.eqs, "device_id")).toBe("d1");
  });

  it("is idempotent when the anchor is already this same device", async () => {
    signedInAs("auth-abc", "GoogleName");
    _db.anchorByAuth    = { device_uuid: "d1", display_name: "ΠαιχτηςΧ" };
    _db.profileByDevice = { d1: { display_name: "ΠαιχτηςΧ" } };
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ device_uuid: "d1", restored: false });
    // No profile deletion on the idempotent path.
    expect(_writes.some((w) => w.table === "player_profiles" && w.op === "delete")).toBe(false);
  });
});

// ── Restore mode (returning player on a new device) ─────────────────────────────

describe("POST /api/auth/link — restore mode", () => {
  it("adopts the anchor's device_uuid and reports restored:true", async () => {
    signedInAs("auth-abc", "GoogleName");
    _db.anchorByAuth = { device_uuid: "canon", display_name: "OldName" };
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      device_uuid: "canon",
      display_name: "OldName",
      restored: true,
    });
  });

  it("deletes this device's old profile row", async () => {
    signedInAs("auth-abc");
    _db.anchorByAuth = { device_uuid: "canon", display_name: "OldName" };
    await POST(makePostReq(BASE));
    const del = _writes.find((w) => w.table === "player_profiles" && w.op === "delete");
    expect(eqVal(del!.eqs, "device_uuid")).toBe("d1");
  });

  it("re-points a puzzle only the old device played onto the canonical identity", async () => {
    signedInAs("auth-abc");
    _db.anchorByAuth   = { device_uuid: "canon", display_name: "OldName" };
    _db.scoresByDevice = {
      d1:    [{ id: 1, game_id: "leksokipos", puzzle_date: "2026-07-01", score: 40 }],
      canon: [],
    };
    await POST(makePostReq(BASE));

    const repoint = _writes.find((w) => w.table === "game_scores" && w.op === "update");
    expect(repoint?.payload).toMatchObject({ device_id: "canon", auth_user_id: "auth-abc" });
    expect(repoint?.ins).toContainEqual(["id", [1]]);
  });

  it("deletes the old row when the canonical identity already scored higher", async () => {
    signedInAs("auth-abc");
    _db.anchorByAuth   = { device_uuid: "canon", display_name: "OldName" };
    _db.scoresByDevice = {
      d1:    [{ id: 1, game_id: "leksokipos", puzzle_date: "2026-07-01", score: 30 }],
      canon: [{ id: 9, game_id: "leksokipos", puzzle_date: "2026-07-01", score: 40 }],
    };
    await POST(makePostReq(BASE));

    const deletes = _writes.filter((w) => w.table === "game_scores" && w.op === "delete");
    expect(deletes.some((w) => w.ins.some(([, v]) => JSON.stringify(v) === "[1]"))).toBe(true);
    // Nothing was re-pointed (the old row lost).
    expect(_writes.some((w) => w.table === "game_scores" && w.op === "update")).toBe(false);
  });

  it("re-points the old row and drops the canonical row when the old score is higher", async () => {
    signedInAs("auth-abc");
    _db.anchorByAuth   = { device_uuid: "canon", display_name: "OldName" };
    _db.scoresByDevice = {
      d1:    [{ id: 1, game_id: "leksokipos", puzzle_date: "2026-07-01", score: 55 }],
      canon: [{ id: 9, game_id: "leksokipos", puzzle_date: "2026-07-01", score: 40 }],
    };
    await POST(makePostReq(BASE));

    const repoint = _writes.find((w) => w.table === "game_scores" && w.op === "update");
    expect(repoint?.ins).toContainEqual(["id", [1]]);
    const del = _writes.find((w) => w.table === "game_scores" && w.op === "delete");
    expect(del?.ins).toContainEqual(["id", [9]]);
  });
});

// ── Error paths ───────────────────────────────────────────────────────────────

describe("POST /api/auth/link — error paths", () => {
  it("500 when the profile upsert fails", async () => {
    signedInAs("auth-abc");
    _db.failUpsert = true;
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(500);
  });

  it("still 200 when the back-fill fails (non-fatal)", async () => {
    signedInAs("auth-abc");
    _db.failBackfill = true;
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
  });
});
