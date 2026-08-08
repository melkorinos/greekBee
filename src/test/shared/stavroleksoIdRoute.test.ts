// stavroleksoIdRoute.test.ts — unit tests for GET/PATCH /api/community-puzzles/stavrolekso/[id].
// Supabase is mocked; no real network calls are made.
//
// GET  — fetch a single puzzle by id (public).
// PATCH — creator edit: validates edit_pin + pending status before updating.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

import { makeQueuedClient, tableShim } from "@/test/helpers/supabaseMock";

// Both clients draw from one queue: the tests care about the sequence of calls,
// not which client made them. Which client the UPDATE uses is pinned separately
// (getServiceRoleClient is spied on below) because RLS makes that the difference
// between an edit persisting and silently vanishing.
const _db = makeQueuedClient();

const getServiceRoleClient = vi.fn(() => _db.client);
const getSupabaseClient    = vi.fn(() => _db.client);

vi.mock("@/lib/supabase", () => ({
  table: tableShim,
  getSupabaseClient: () => getSupabaseClient(),
  getServiceRoleClient: () => getServiceRoleClient(),
}));

const { GET, PATCH } = await import("@/app/api/community-puzzles/stavrolekso/[id]/route");

// ── Helpers ───────────────────────────────────────────────────────────────────

const enqueue = _db.enqueue;

function withParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeReq(id: string) {
  return new NextRequest(`http://localhost/api/community-puzzles/stavrolekso/${id}`);
}

function makePatch(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/community-puzzles/stavrolekso/${id}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

// Minimal data blob passing the shared invariants (validateStavroleksoData):
// square supported grid + at least one slot in each direction.
const PUZZLE_DATA = {
  width: 9, height: 9,
  blackSquares: [],
  slots: [
    { number: 1, direction: "across", startRow: 0, startCol: 0, answer: "ααα", clue: "χ" },
    { number: 1, direction: "down",   startRow: 0, startCol: 0, answer: "ααα", clue: "ψ" },
  ],
  cells: {},
};

beforeEach(() => {
  _db.reset();
  getServiceRoleClient.mockClear();
  getSupabaseClient.mockClear();
});
afterEach(()  => { _db.reset(); });

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/community-puzzles/stavrolekso/[id]", () => {
  it("200 and returns puzzle when found", async () => {
    const puzzleRow = {
      id: "p1", title: "Σταυρόλεξο 1", submitter_name: "Νίκος",
      data: PUZZLE_DATA, status: "approved", created_at: "2026-01-01",
    };
    enqueue({ data: puzzleRow, error: null });
    const res  = await GET(makeReq("p1"), withParams("p1"));
    const json = await res.json() as { puzzle: typeof puzzleRow };
    expect(res.status).toBe(200);
    expect(json.puzzle.id).toBe("p1");
    expect(json.puzzle.title).toBe("Σταυρόλεξο 1");
  });

  it("404 when puzzle is not found", async () => {
    enqueue({ data: null, error: { message: "no rows" } });
    const res = await GET(makeReq("missing"), withParams("missing"));
    expect(res.status).toBe(404);
  });
});

// ── PATCH ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/community-puzzles/stavrolekso/[id] — validation", () => {
  it("400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/community-puzzles/stavrolekso/p1", {
      method: "PATCH", body: "{bad", headers: { "Content-Type": "application/json" },
    });
    expect((await PATCH(req, withParams("p1"))).status).toBe(400);
  });

  it("400 when edit_pin is missing", async () => {
    const res = await PATCH(makePatch("p1", { data: PUZZLE_DATA }), withParams("p1"));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/community-puzzles/stavrolekso/[id] — auth + state guards", () => {
  it("404 when puzzle does not exist", async () => {
    enqueue({ data: null, error: { message: "no rows" } });
    const res = await PATCH(makePatch("p1", { edit_pin: "1234", data: PUZZLE_DATA }), withParams("p1"));
    expect(res.status).toBe(404);
  });

  it("403 when puzzle is no longer pending (e.g. approved)", async () => {
    enqueue({ data: { status: "approved", edit_pin: "1234" }, error: null });
    const res = await PATCH(makePatch("p1", { edit_pin: "1234", data: PUZZLE_DATA }), withParams("p1"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/no longer editable/i);
  });

  it("403 when edit_pin does not match", async () => {
    enqueue({ data: { status: "pending", edit_pin: "correct-pin" }, error: null });
    const res = await PATCH(makePatch("p1", { edit_pin: "wrong-pin", data: PUZZLE_DATA }), withParams("p1"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/incorrect pin/i);
  });

  it("400 when an edit would regress the puzzle below the submission invariants", async () => {
    enqueue({ data: { status: "pending", edit_pin: "pin123" }, error: null });
    const res = await PATCH(
      makePatch("p1", { edit_pin: "pin123", data: { ...PUZZLE_DATA, slots: [] } }),
      withParams("p1"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/τουλάχιστον ένα slot/);
  });
});

describe("PATCH /api/community-puzzles/stavrolekso/[id] — happy path", () => {
  it("200 ok when PIN matches and puzzle is still pending", async () => {
    enqueue({ data: { status: "pending", edit_pin: "correct" }, error: null }); // fetch
    enqueue({ data: [{ id: 1 }], error: null });                                // update
    const res = await PATCH(
      makePatch("p1", { edit_pin: "correct", data: PUZZLE_DATA, title: "Νέος τίτλος" }),
      withParams("p1"),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("200 ok even when optional title/submitter_name are omitted", async () => {
    enqueue({ data: { status: "pending", edit_pin: "pin123" }, error: null });
    enqueue({ data: [{ id: 1 }], error: null });
    const res = await PATCH(makePatch("p1", { edit_pin: "pin123", data: PUZZLE_DATA }), withParams("p1"));
    expect(res.status).toBe(200);
  });

  it("500 on DB update error", async () => {
    enqueue({ data: { status: "pending", edit_pin: "pin123" }, error: null });
    enqueue({ error: { message: "update failed" } });
    const res = await PATCH(makePatch("p1", { edit_pin: "pin123", data: PUZZLE_DATA }), withParams("p1"));
    expect(res.status).toBe(500);
  });
});

// The table grants anon INSERT and SELECT but no UPDATE, and RLS cannot see the
// request's edit_pin. An anon UPDATE therefore matches zero rows *without error* —
// so the edit is discarded and the creator is told ok:true. These two lock the fix.
describe("PATCH /api/community-puzzles/stavrolekso/[id] — the edit actually persists", () => {
  it("writes through the service-role client, which RLS grants UPDATE", async () => {
    enqueue({ data: { status: "pending", edit_pin: "pin123" }, error: null });
    enqueue({ data: [{ id: 1 }], error: null });
    await PATCH(makePatch("p1", { edit_pin: "pin123", data: PUZZLE_DATA }), withParams("p1"));
    expect(getServiceRoleClient).toHaveBeenCalled();
  });

  it("500s rather than ok:true when the UPDATE touches no row", async () => {
    enqueue({ data: { status: "pending", edit_pin: "pin123" }, error: null });
    enqueue({ data: [], error: null }); // RLS/no-match: empty set, no error
    const res = await PATCH(makePatch("p1", { edit_pin: "pin123", data: PUZZLE_DATA }), withParams("p1"));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBeUndefined();
  });
});

// anon no longer holds a column grant on edit_pin (migration 20260717120000), so a
// PIN lookup on the anon client comes back with the column missing — the PIN check
// would compare against undefined and 403 every real creator. The read side of this
// route is as privileged as the write side; neither may touch the anon client.
describe("PATCH /api/community-puzzles/stavrolekso/[id] — never reads through anon", () => {
  it("looks the PIN up with the service-role client", async () => {
    enqueue({ data: { status: "pending", edit_pin: "pin123" }, error: null });
    enqueue({ data: [{ id: 1 }], error: null });
    await PATCH(makePatch("p1", { edit_pin: "pin123", data: PUZZLE_DATA }), withParams("p1"));
    expect(getSupabaseClient).not.toHaveBeenCalled();
  });

  it("never touches the anon client on the 404 path either", async () => {
    enqueue({ data: null, error: { message: "no rows" } });
    await PATCH(makePatch("p1", { edit_pin: "pin123", data: PUZZLE_DATA }), withParams("p1"));
    expect(getSupabaseClient).not.toHaveBeenCalled();
  });
});
