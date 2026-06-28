// communityPuzzleLifecycle.test.ts
// Tests the Community Puzzle Lifecycle module through its interface:
// createSubmitHandler / createListHandler / createReviewHandler with a
// synthetic game config. The four real route files are thin entry points
// over these handlers, so this is the test surface for all of them.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock (records the call chain so assertions can see table/args) ──

type ChainResult = { data?: unknown; error?: { message: string } | null };
type RecordedCall = { table: string; op: string; args: unknown[] };

let _queue: ChainResult[] = [];
let _calls: RecordedCall[] = [];

function makeChain(table: string, result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const record = (op: string) => (...args: unknown[]) => {
    _calls.push({ table, op, args });
    return chain;
  };
  for (const op of ["insert", "select", "update", "delete", "eq", "order", "limit"]) {
    chain[op] = record(op);
  }
  chain.single = () => {
    _calls.push({ table, op: "single", args: [] });
    return Promise.resolve(result);
  };
  chain.then = (resolve: (v: ChainResult) => void) => resolve(result);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    from: (table: string) => {
      const result = _queue.shift() ?? { data: null, error: null };
      return makeChain(table, result);
    },
  }),
}));

const { consumeApprovedPuzzle, createListHandler, createReviewHandler, createSubmitHandler } =
  await import("@/lib/communityPuzzleLifecycle");
type SubmissionValidation = import("@/lib/communityPuzzleLifecycle").SubmissionValidation;

// ── Synthetic game config ─────────────────────────────────────────────────────

const TABLE = "community_test_puzzles";

// Accepts { word: string }, rejects anything else with a 422.
function validate(body: unknown): SubmissionValidation {
  const { word } = (body ?? {}) as { word?: unknown };
  if (typeof word !== "string" || !word.trim()) {
    return { ok: false, status: 422, body: { error: "word is required" } };
  }
  return { ok: true, row: { data: { word: word.trim() } } };
}

const baseConfig = { table: TABLE, validate };

// ── Helpers ───────────────────────────────────────────────────────────────────

const CORRECT_SECRET = "test-secret";

function makeReq(
  method: "POST" | "GET" | "PATCH",
  body?: unknown,
  opts: { secret?: string; query?: string } = {},
): NextRequest {
  const url = `http://localhost/api/community-puzzles/test${opts.query ?? ""}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.secret !== undefined) headers["X-Admin-Secret"] = opts.secret;
  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  _queue = [];
  _calls = [];
  process.env.ADMIN_SECRET = CORRECT_SECRET;
});
afterEach(() => {
  _queue = [];
  _calls = [];
  delete process.env.ADMIN_SECRET;
});

// ── Submit ────────────────────────────────────────────────────────────────────

describe("createSubmitHandler", () => {
  it("returns 400 for invalid JSON", async () => {
    const POST = createSubmitHandler(baseConfig);
    const req = new NextRequest("http://localhost/api/community-puzzles/test", {
      method: "POST", body: "not-json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("passes the validation adapter's error response through verbatim", async () => {
    const POST = createSubmitHandler(baseConfig);
    const res = await POST(makeReq("POST", { word: "" }));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "word is required" });
  });

  it("inserts the adapter's row with status 'pending' into the configured table", async () => {
    const POST = createSubmitHandler(baseConfig);
    const res = await POST(makeReq("POST", { word: " γεια " }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const insert = _calls.find((c) => c.op === "insert");
    expect(insert?.table).toBe(TABLE);
    expect(insert?.args[0]).toEqual({ data: { word: "γεια" }, status: "pending" });
  });

  it("echoes the inserted id when returnInsertedId is set", async () => {
    _queue.push({ data: { id: 42 }, error: null });
    const POST = createSubmitHandler({ ...baseConfig, returnInsertedId: true });
    const res = await POST(makeReq("POST", { word: "γεια" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: 42 });
    expect(_calls.map((c) => c.op)).toContain("single");
  });

  it("returns 500 on DB error", async () => {
    _queue.push({ data: null, error: { message: "db fail" } });
    const POST = createSubmitHandler(baseConfig);
    const res = await POST(makeReq("POST", { word: "γεια" }));
    expect(res.status).toBe(500);
  });
});

// ── List ──────────────────────────────────────────────────────────────────────

describe("createListHandler — admin-only games", () => {
  it("returns 401 with no X-Admin-Secret header", async () => {
    const GET = createListHandler(baseConfig);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const GET = createListHandler(baseConfig);
    const res = await GET(makeReq("GET", undefined, { secret: "wrong" }));
    expect(res.status).toBe(401);
  });

  it("defaults to status=pending, oldest first, default columns", async () => {
    _queue.push({ data: [{ id: 1 }], error: null });
    const GET = createListHandler(baseConfig);
    const res = await GET(makeReq("GET", undefined, { secret: CORRECT_SECRET }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ puzzles: [{ id: 1 }] });

    expect(_calls.find((c) => c.op === "select")?.args[0])
      .toBe("id, submitter_name, data, status, created_at");
    expect(_calls.find((c) => c.op === "eq")?.args).toEqual(["status", "pending"]);
    expect(_calls.find((c) => c.op === "order")?.args).toEqual(["created_at", { ascending: true }]);
  });

  it("returns 500 on DB error", async () => {
    _queue.push({ data: null, error: { message: "db fail" } });
    const GET = createListHandler(baseConfig);
    const res = await GET(makeReq("GET", undefined, { secret: CORRECT_SECRET }));
    expect(res.status).toBe(500);
  });
});

describe("createListHandler — publicApprovedList (Stavrolekso shape)", () => {
  const config = {
    ...baseConfig,
    select:             "id, title, submitter_name, data, status, created_at",
    listOrder:          "desc" as const,
    publicApprovedList: true,
  };

  it("serves the approved list without admin secret, newest first", async () => {
    _queue.push({ data: [{ id: 2 }], error: null });
    const GET = createListHandler(config);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ puzzles: [{ id: 2 }] });

    expect(_calls.find((c) => c.op === "select")?.args[0])
      .toBe("id, title, submitter_name, data, status, created_at");
    expect(_calls.find((c) => c.op === "eq")?.args).toEqual(["status", "approved"]);
    expect(_calls.find((c) => c.op === "order")?.args).toEqual(["created_at", { ascending: false }]);
  });

  it("still requires admin for status=pending", async () => {
    const GET = createListHandler(config);
    const res = await GET(makeReq("GET", undefined, { query: "?status=pending" }));
    expect(res.status).toBe(401);
  });

  it("serves status=pending with the admin secret", async () => {
    _queue.push({ data: [], error: null });
    const GET = createListHandler(config);
    const res = await GET(makeReq("GET", undefined, { query: "?status=pending", secret: CORRECT_SECRET }));
    expect(res.status).toBe(200);
    expect(_calls.find((c) => c.op === "eq")?.args).toEqual(["status", "pending"]);
  });
});

// ── Consume ─────────────────────────────────────────────────────────────────────
// The fourth lifecycle transition: a game's data loader claims the oldest approved
// row, the module deletes it, and the loader receives data + submitter_name. The
// three game data loaders (Leksiarxeio, Vres Tin Frasi, Leksindeseis) are thin
// mappers over this, so this is their consume test surface.

describe("consumeApprovedPuzzle", () => {
  it("claims the oldest approved row (limit 1), deletes it by id, returns data + submitter_name", async () => {
    _queue.push({ data: { id: 3, submitter_name: "Νίκος", data: { phrase: "γεια σου" } }, error: null });

    const result = await consumeApprovedPuzzle<{ phrase: string }>(TABLE);
    expect(result).toEqual({ data: { phrase: "γεια σου" }, submitter_name: "Νίκος" });

    expect(_calls.find((c) => c.op === "eq")?.args).toEqual(["status", "approved"]);
    expect(_calls.find((c) => c.op === "order")?.args).toEqual(["created_at", { ascending: true }]);
    expect(_calls.find((c) => c.op === "limit")?.args).toEqual([1]);

    const del = _calls.find((c) => c.op === "delete");
    expect(del?.table).toBe(TABLE);
    expect(_calls.filter((c) => c.op === "eq").pop()?.args).toEqual(["id", 3]);
  });

  it("returns null and attempts no delete when the queue is empty", async () => {
    _queue.push({ data: null, error: null });
    const result = await consumeApprovedPuzzle(TABLE);
    expect(result).toBeNull();
    expect(_calls.find((c) => c.op === "delete")).toBeUndefined();
  });

  it("returns null on DB error so the loader falls through to its static fallback", async () => {
    _queue.push({ data: null, error: { message: "db fail" } });
    const result = await consumeApprovedPuzzle(TABLE);
    expect(result).toBeNull();
    expect(_calls.find((c) => c.op === "delete")).toBeUndefined();
  });

  it("normalises a blank submitter_name to null", async () => {
    _queue.push({ data: { id: 4, submitter_name: "", data: { phrase: "x" } }, error: null });
    const result = await consumeApprovedPuzzle<{ phrase: string }>(TABLE);
    expect(result?.submitter_name).toBeNull();
  });
});

// ── Review ────────────────────────────────────────────────────────────────────

describe("createReviewHandler", () => {
  const PATCH = createReviewHandler({ table: TABLE });

  it("returns 401 with no X-Admin-Secret header", async () => {
    const res = await PATCH(makeReq("PATCH", { action: "approve" }), params("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/community-puzzles/test/1/review", {
      method: "PATCH", headers: { "X-Admin-Secret": CORRECT_SECRET }, body: "not-json{{",
    });
    const res = await PATCH(req, params("1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown action", async () => {
    const res = await PATCH(
      makeReq("PATCH", { action: "suspend" }, { secret: CORRECT_SECRET }),
      params("1"),
    );
    expect(res.status).toBe(400);
  });

  it("approve → UPDATE status='approved' on the configured table", async () => {
    const res = await PATCH(
      makeReq("PATCH", { action: "approve" }, { secret: CORRECT_SECRET }),
      params("5"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const update = _calls.find((c) => c.op === "update");
    expect(update?.table).toBe(TABLE);
    expect(update?.args[0]).toEqual({ status: "approved" });
    expect(_calls.find((c) => c.op === "eq")?.args).toEqual(["id", "5"]);
  });

  it("reject → DELETE row on the configured table", async () => {
    const res = await PATCH(
      makeReq("PATCH", { action: "reject" }, { secret: CORRECT_SECRET }),
      params("7"),
    );
    expect(res.status).toBe(200);
    expect(_calls.find((c) => c.op === "delete")?.table).toBe(TABLE);
    expect(_calls.find((c) => c.op === "eq")?.args).toEqual(["id", "7"]);
  });

  it("returns 500 on DB error", async () => {
    _queue.push({ data: null, error: { message: "db fail" } });
    const res = await PATCH(
      makeReq("PATCH", { action: "approve" }, { secret: CORRECT_SECRET }),
      params("5"),
    );
    expect(res.status).toBe(500);
  });
});
