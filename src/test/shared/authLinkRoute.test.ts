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
interface AchievementRow { id: number; achievement_id: string }
interface MilestoneRow { id: number; puzzle_date: string; kind: string; detail: string }
interface Anchor   { device_uuid: string; display_name: string }

interface DbState {
  /** player_profiles row for the signed-in auth_user_id (the identity anchor). */
  anchorByAuth?:    Anchor | null;
  /** player_profiles row by device_uuid. */
  profileByDevice?: Record<string, { display_name: string; auth_user_id?: string | null }>;
  /** game_scores rows by device_id. */
  scoresByDevice?:  Record<string, ScoreRow[]>;
  /** player_achievements rows by device_uuid. */
  achievementsByDevice?: Record<string, AchievementRow[]>;
  /** player_milestones rows by device_uuid. */
  milestonesByDevice?: Record<string, MilestoneRow[]>;
  failUpsert?:      boolean;
  failAuditInsert?: boolean;
}

interface RecordedWrite {
  table:   string;
  /** A chain starts in "select" and is promoted by the first write verb it sees.
   *  "select" is a real state of the mock's state machine — the tests below filter
   *  it out with `op !== "select"` — so the union has to admit it. */
  op:      "select" | "upsert" | "update" | "delete" | "insert";
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
  if (table === "player_achievements") {
    const device = eqVal(eqs, "device_uuid") as string;
    return { data: _db.achievementsByDevice?.[device] ?? [], error: null };
  }
  if (table === "player_milestones") {
    const device = eqVal(eqs, "device_uuid") as string;
    return { data: _db.milestonesByDevice?.[device] ?? [], error: null };
  }
  return { data: null, error: null };
}

function resolveWrite(w: RecordedWrite) {
  if (w.table === "player_profiles" && w.op === "upsert" && _db.failUpsert) {
    return { data: null, error: { message: "upsert failed" } };
  }
  if (w.table === "identity_audit" && w.op === "insert" && _db.failAuditInsert) {
    return { data: null, error: { message: "audit insert failed" } };
  }
  return { data: null, error: null };
}

function makeChain(table: string) {
  const st: RecordedWrite = { table, op: "select", eqs: [], ins: [] };
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.update = (p: unknown) => { st.op = "update"; st.payload = p; return chain; };
  chain.delete = () => { st.op = "delete"; return chain; };
  chain.eq = (c: string, v: unknown) => { st.eqs.push([c, v]); return chain; };
  chain.is = (c: string, v: unknown) => { st.eqs.push([c, v]); return chain; };
  chain.in = (c: string, v: unknown[]) => { st.ins.push([c, v]); return chain; };
  chain.upsert = (p: unknown) => {
    st.op = "upsert"; st.payload = p;
    _writes.push(st);
    return Promise.resolve(resolveWrite(st));
  };
  chain.insert = (p: unknown) => {
    st.op = "insert"; st.payload = p;
    _writes.push(st);
    return Promise.resolve(resolveWrite(st));
  };
  chain.maybeSingle = () => Promise.resolve(resolveRead(table, st.eqs));
  chain.single      = () => Promise.resolve(resolveRead(table, st.eqs));
  chain.then = (resolve: (v: unknown) => void) => {
    if (st.op === "select") return resolve(resolveRead(table, st.eqs));
    _writes.push(st);
    return resolve(resolveWrite(st));
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  table: (c: { from: (n: string) => unknown }, n: string) => c.from(n),
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

function auditInserts() {
  return _writes.filter((w) => w.table === "identity_audit" && w.op === "insert");
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

  it("never writes to game_scores on link (auth_user_id column dropped — device_id is the sole key)", async () => {
    signedInAs("auth-abc");
    await POST(makePostReq(BASE));
    expect(_writes.some((w) => w.table === "game_scores")).toBe(false);
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
    expect(repoint?.payload).toEqual({ device_id: "canon" });
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

  // ── Achievement merge (ADR 0013): the earned set must survive Restore ──────────

  it("re-points the old device's achievements onto the canonical identity (union)", async () => {
    signedInAs("auth-abc");
    _db.anchorByAuth = { device_uuid: "canon", display_name: "OldName" };
    _db.achievementsByDevice = {
      d1:    [{ id: 1, achievement_id: "leksokipos-tzimani-chalkino" },
              { id: 2, achievement_id: "leksokipos-sidirodromos" }],
      canon: [{ id: 9, achievement_id: "leksokipos-stin-korifi-chalkino" }],
    };
    await POST(makePostReq(BASE));

    const repoint = _writes.find((w) => w.table === "player_achievements" && w.op === "update");
    expect(repoint?.payload).toEqual({ device_uuid: "canon" });
    // Both disjoint old rows carry over → canonical ends up with the union.
    expect(repoint?.ins.find(([c]) => c === "id")?.[1]).toEqual(expect.arrayContaining([1, 2]));
    // Nothing to delete — no overlap.
    expect(_writes.some((w) => w.table === "player_achievements" && w.op === "delete")).toBe(false);
  });

  it("drops the old duplicate when the canonical identity already earned it", async () => {
    signedInAs("auth-abc");
    _db.anchorByAuth = { device_uuid: "canon", display_name: "OldName" };
    _db.achievementsByDevice = {
      d1:    [{ id: 1, achievement_id: "leksokipos-tzimani-chalkino" }],
      canon: [{ id: 9, achievement_id: "leksokipos-tzimani-chalkino" }], // already earned
    };
    await POST(makePostReq(BASE));

    const del = _writes.find((w) => w.table === "player_achievements" && w.op === "delete");
    expect(del?.ins).toContainEqual(["id", [1]]);
    // The duplicate can't be re-pointed (unique constraint) — nothing re-pointed.
    expect(_writes.some((w) => w.table === "player_achievements" && w.op === "update")).toBe(false);
  });

  // ── Milestone merge (ADR 0013): the append-only fact set must union on Restore ──
  //
  // One merge covers all four kinds — pangram/word finds and the two day counters —
  // replacing the separate pangram and word merges the two dropped tables each had.

  it("re-points the old device's milestones onto the canonical identity (union)", async () => {
    signedInAs("auth-abc");
    _db.anchorByAuth = { device_uuid: "canon", display_name: "OldName" };
    _db.milestonesByDevice = {
      d1:    [{ id: 1, puzzle_date: "2026-07-06", kind: "pangram", detail: "διακοπτησ" },
              { id: 2, puzzle_date: "2026-07-07", kind: "word", detail: "παρακολουθηση" },
              { id: 3, puzzle_date: "2026-07-07", kind: "top_rank", detail: "" }],
      canon: [{ id: 9, puzzle_date: "2026-07-05", kind: "pangram", detail: "θαλασσινοσ" }],
    };
    await POST(makePostReq(BASE));

    const repoint = _writes.find((w) => w.table === "player_milestones" && w.op === "update");
    expect(repoint?.payload).toEqual({ device_uuid: "canon" });
    expect(repoint?.ins.find(([c]) => c === "id")?.[1]).toEqual(expect.arrayContaining([1, 2, 3]));
    expect(_writes.some((w) => w.table === "player_milestones" && w.op === "delete")).toBe(false);
  });

  it("drops the old duplicate when the canonical already has the same day+kind+detail", async () => {
    signedInAs("auth-abc");
    _db.anchorByAuth = { device_uuid: "canon", display_name: "OldName" };
    _db.milestonesByDevice = {
      d1:    [{ id: 1, puzzle_date: "2026-07-06", kind: "pangram", detail: "διακοπτησ" }],
      canon: [{ id: 9, puzzle_date: "2026-07-06", kind: "pangram", detail: "διακοπτησ" }], // overlap
    };
    await POST(makePostReq(BASE));

    const del = _writes.find((w) => w.table === "player_milestones" && w.op === "delete");
    expect(del?.ins).toContainEqual(["id", [1]]);
    expect(_writes.some((w) => w.table === "player_milestones" && w.op === "update")).toBe(false);
  });

  it("keeps a day counter that differs from the canonical's only by kind", async () => {
    // top_rank and tzimani both carry detail '' — merging on (date, detail) alone
    // would silently delete one of them as a duplicate.
    signedInAs("auth-abc");
    _db.anchorByAuth = { device_uuid: "canon", display_name: "OldName" };
    _db.milestonesByDevice = {
      d1:    [{ id: 1, puzzle_date: "2026-07-06", kind: "tzimani", detail: "" }],
      canon: [{ id: 9, puzzle_date: "2026-07-06", kind: "top_rank", detail: "" }],
    };
    await POST(makePostReq(BASE));

    const repoint = _writes.find((w) => w.table === "player_milestones" && w.op === "update");
    expect(repoint?.ins).toContainEqual(["id", [1]]);
    expect(_writes.some((w) => w.table === "player_milestones" && w.op === "delete")).toBe(false);
  });

  it("runs one milestone merge, not one per kind", async () => {
    signedInAs("auth-abc");
    _db.anchorByAuth = { device_uuid: "canon", display_name: "OldName" };
    _db.milestonesByDevice = {
      d1: [{ id: 1, puzzle_date: "2026-07-06", kind: "pangram", detail: "διακοπτησ" },
           { id: 2, puzzle_date: "2026-07-06", kind: "word", detail: "παρακολουθηση" }],
    };
    await POST(makePostReq(BASE));

    expect(_writes.filter((w) => w.table === "player_milestones" && w.op === "update")).toHaveLength(1);
  });
});

// ── Occupied-device guard (ADR 0012 amendment / issue 01) ───────────────────────
//
// The caller's current device row is already linked to a *different* account (a
// shared browser left un-Disconnected). The route must never overwrite or absorb
// that resident row: a returning caller adopts their own canonical identity
// (no merge), a first-time caller is minted a fresh device_uuid.

describe("POST /api/auth/link — occupied-device guard", () => {
  function writesTo(table: string) {
    return _writes.filter((w) => w.table === table && w.op !== "select");
  }

  it("returning caller adopts their own canonical id and leaves the resident untouched", async () => {
    signedInAs("auth-B");
    _db.anchorByAuth    = { device_uuid: "canonB", display_name: "PlayerB" };
    _db.profileByDevice = { d1: { display_name: "PlayerA", auth_user_id: "auth-A" } };
    // Resident history present — the bug would merge it into the caller.
    _db.scoresByDevice       = { d1: [{ id: 1, game_id: "leksokipos", puzzle_date: "2026-07-01", score: 40 }] };
    _db.achievementsByDevice = { d1: [{ id: 7, achievement_id: "leksokipos-tzimani-chalkino" }] };
    _db.milestonesByDevice   = { d1: [{ id: 8, puzzle_date: "2026-07-01", kind: "pangram", detail: "διακοπτησ" }] };

    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      device_uuid: "canonB", display_name: "PlayerB", restored: true,
    });
    // Resident A is fully untouched: no score merge, no achievement merge, no
    // milestone merge, no profile delete or upsert.
    expect(writesTo("game_scores")).toHaveLength(0);
    expect(writesTo("player_achievements")).toHaveLength(0);
    expect(writesTo("player_milestones")).toHaveLength(0);
    expect(writesTo("player_profiles")).toHaveLength(0);
  });

  it("first-time caller is minted a fresh device_uuid, never overwriting the resident", async () => {
    signedInAs("auth-B", "PlayerB");
    _db.profileByDevice = { d1: { display_name: "PlayerA", auth_user_id: "auth-A" } };

    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.restored).toBe(false);
    expect(json.device_uuid).not.toBe("d1");
    expect(json.display_name).toBe("PlayerB");

    // The new row carries the caller's account on a fresh device id.
    const upsert = upsertOf("player_profiles")!.payload as { device_uuid: string; auth_user_id: string };
    expect(upsert.auth_user_id).toBe("auth-B");
    expect(upsert.device_uuid).not.toBe("d1");
    // No write anywhere targets the resident's d1 row.
    const touchesResident = _writes.some(
      (w) => w.op !== "select" &&
        (eqVal(w.eqs, "device_uuid") === "d1" ||
         (w.payload as { device_uuid?: string })?.device_uuid === "d1"),
    );
    expect(touchesResident).toBe(false);
  });
});

// ── identity_audit (ADR 0012, corrected 2026-07-03) ─────────────────────────────
//
// Change-only, link-time: a row is appended only when the link establishes a
// mapping the profile row didn't already hold. Disconnect never writes here —
// it is local-only and player_profiles keeps the pair.

describe("POST /api/auth/link — identity_audit", () => {
  it("appends the mapping on a first link (no prior auth on the row)", async () => {
    signedInAs("auth-abc");
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
    expect(auditInserts()).toHaveLength(1);
    expect(auditInserts()[0]!.payload).toEqual({ auth_user_id: "auth-abc", device_uuid: "d1" });
  });

  it("appends nothing on a repeat sign-in (row already maps to this account)", async () => {
    signedInAs("auth-abc");
    _db.anchorByAuth    = { device_uuid: "d1", display_name: "ΠαιχτηςΧ" };
    _db.profileByDevice = { d1: { display_name: "ΠαιχτηςΧ", auth_user_id: "auth-abc" } };
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
    expect(auditInserts()).toHaveLength(0);
  });

  it("appends the fresh mapping (not the resident's device) on a shared-computer first sign-in", async () => {
    signedInAs("auth-B");
    _db.profileByDevice = { d1: { display_name: "PlayerA", auth_user_id: "auth-A" } };
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
    expect(auditInserts()).toHaveLength(1);
    const { auth_user_id, device_uuid } = auditInserts()[0]!.payload as {
      auth_user_id: string; device_uuid: string;
    };
    expect(auth_user_id).toBe("auth-B");
    // Occupied-device guard: the audited device is the freshly minted one, never
    // the resident's d1.
    expect(device_uuid).not.toBe("d1");
  });

  it("appends nothing on restore (the anchor row already holds the pair)", async () => {
    signedInAs("auth-abc");
    _db.anchorByAuth = { device_uuid: "canon", display_name: "OldName" };
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
    expect(auditInserts()).toHaveLength(0);
  });

  it("still 200 when the audit insert fails (non-fatal)", async () => {
    signedInAs("auth-abc");
    _db.failAuditInsert = true;
    const res = await POST(makePostReq(BASE));
    expect(res.status).toBe(200);
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
});
