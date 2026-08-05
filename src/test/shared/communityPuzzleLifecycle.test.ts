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

vi.mock("@/lib/supabase", () => {
  const client = {
    from: (table: string) => {
      const result = _queue.shift() ?? { data: null, error: null };
      return makeChain(table, result);
    },
  };
  // The admin/privileged paths (list, review, consume) use the service-role
  // client; the public submit path uses the anon client. Both share the queue.
  return {
  table: (c: { from: (n: string) => unknown }, n: string) => c.from(n),
    getSupabaseClient:    () => client,
    getServiceRoleClient: () => client,
  };
});

const { consumeApprovedPuzzle, createListHandler, createReviewHandler, createSubmitHandler } =
  await import("@/lib/communityPuzzleLifecycle");
type SubmissionValidation = import("@/lib/communityPuzzleLifecycle").SubmissionValidation;
type CommunityPuzzleGameConfig = import("@/lib/communityPuzzleLifecycle").CommunityPuzzleGameConfig;

// ── Synthetic game config ─────────────────────────────────────────────────────

// A real community queue rather than a synthetic name: config.table is typed to
// CommunityPuzzleTable now, so an invented table would not compile. The Supabase
// client is mocked wholesale below, so which of the four this is has no bearing
// on what these tests exercise — the module stays game-agnostic.
const TABLE = "community_vrestifrasi_puzzles";

// Accepts { word: string }, rejects anything else with a 422.
function validate(body: unknown): SubmissionValidation {
  const { word } = (body ?? {}) as { word?: unknown };
  if (typeof word !== "string" || !word.trim()) {
    return { ok: false, status: 422, body: { error: "word is required" } };
  }
  return { ok: true, row: { data: { word: word.trim() } } };
}

const baseConfig: CommunityPuzzleGameConfig = { table: TABLE, validate };

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
// The fourth lifecycle transition: a game's data loader reads the approved row
// scheduled for the date being served and receives data + submitter_name. The row
// stays put. The three game data loaders (Leksiarxeio, Vres Tin Frasi,
// Leksindeseis) are thin mappers over this; their own date-passing and static
// fallback live in communityPuzzleScheduling.test.ts.

describe("consumeApprovedPuzzle", () => {
  const DATE = "2026-08-10";

  it("reads the row scheduled for the requested date and returns data + submitter_name", async () => {
    _queue.push({ data: { id: 3, submitter_name: "Νίκος", data: { phrase: "γεια σου" } }, error: null });

    const result = await consumeApprovedPuzzle<{ phrase: string }>(TABLE, DATE);
    expect(result).toEqual({ data: { phrase: "γεια σου" }, submitter_name: "Νίκος" });

    const eqs = _calls.filter((c) => c.op === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["status", "approved"]);
    expect(eqs).toContainEqual(["scheduled_date", DATE]);
  });

  it("never deletes the row — every player on that date must get the same puzzle", async () => {
    // The s134 defect: consume used to DELETE on every call, and the loaders run
    // on every page load, so a refresh destroyed the puzzle and served the next
    // one. Serving is now a pure read.
    _queue.push({ data: { id: 3, submitter_name: "Νίκος", data: { phrase: "γεια σου" } }, error: null });
    await consumeApprovedPuzzle<{ phrase: string }>(TABLE, DATE);
    expect(_calls.find((c) => c.op === "delete")).toBeUndefined();
  });

  it("is idempotent — repeated calls for one date return the same puzzle", async () => {
    const row = { id: 3, submitter_name: "Νίκος", data: { phrase: "γεια σου" } };
    _queue.push({ data: row, error: null });
    _queue.push({ data: row, error: null });

    const first  = await consumeApprovedPuzzle<{ phrase: string }>(TABLE, DATE);
    const second = await consumeApprovedPuzzle<{ phrase: string }>(TABLE, DATE);
    expect(second).toEqual(first);
  });

  it("scopes the read to the requested date, so an archive date cannot serve today's row", async () => {
    _queue.push({ data: null, error: null });
    await consumeApprovedPuzzle(TABLE, "2026-01-02");
    expect(_calls.filter((c) => c.op === "eq").map((c) => c.args))
      .toContainEqual(["scheduled_date", "2026-01-02"]);
  });

  it("returns null when nothing is scheduled for that date", async () => {
    _queue.push({ data: null, error: null });
    expect(await consumeApprovedPuzzle(TABLE, DATE)).toBeNull();
  });

  it("returns null on DB error so the loader falls through to its static fallback", async () => {
    _queue.push({ data: null, error: { message: "db fail" } });
    expect(await consumeApprovedPuzzle(TABLE, DATE)).toBeNull();
  });

  it("normalises a blank submitter_name to null", async () => {
    _queue.push({ data: { id: 4, submitter_name: "", data: { phrase: "x" } }, error: null });
    const result = await consumeApprovedPuzzle<{ phrase: string }>(TABLE, DATE);
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

    const update = _calls.find((c) => c.op === "update");
    expect(update?.table).toBe(TABLE);
    expect((update?.args[0] as { status: string }).status).toBe("approved");
    // Number, not "5": the id column is a bigint, and the route now converts the
    // URL param explicitly instead of leaving the coercion to PostgREST.
    expect(_calls.filter((c) => c.op === "eq").pop()?.args).toEqual(["id", 5]);
  });

  it("reject → DELETE row on the configured table", async () => {
    const res = await PATCH(
      makeReq("PATCH", { action: "reject" }, { secret: CORRECT_SECRET }),
      params("7"),
    );
    expect(res.status).toBe(200);
    expect(_calls.find((c) => c.op === "delete")?.table).toBe(TABLE);
    expect(_calls.filter((c) => c.op === "eq").pop()?.args).toEqual(["id", 7]);
  });

  it("reject does not read the schedule — a rejected row never gets a date", async () => {
    await PATCH(makeReq("PATCH", { action: "reject" }, { secret: CORRECT_SECRET }), params("7"));
    expect(_calls.find((c) => c.op === "update")).toBeUndefined();
  });
});

// ── Review — scheduling ───────────────────────────────────────────────────────
// Approval is where a Community Puzzle gets its release date. The rule: the
// earliest free date strictly after today, unless the admin names one.

describe("createReviewHandler — scheduled release", () => {
  const PATCH = createReviewHandler({ table: TABLE });
  const TODAY = "2026-08-05";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Queues the SELECT of already-taken dates that approval reads first. */
  function enqueueTakenDates(...dates: (string | null)[]) {
    _queue.push({ data: dates.map((d) => ({ scheduled_date: d })), error: null });
  }

  function scheduledDateWritten(): string | null | undefined {
    const update = _calls.find((c) => c.op === "update");
    return (update?.args[0] as { scheduled_date?: string | null })?.scheduled_date;
  }

  it("assigns tomorrow when no future dates are taken", async () => {
    enqueueTakenDates();
    const res = await PATCH(
      makeReq("PATCH", { action: "approve" }, { secret: CORRECT_SECRET }),
      params("5"),
    );
    expect(res.status).toBe(200);
    expect(scheduledDateWritten()).toBe("2026-08-06");
  });

  it("assigns the earliest free date past a booked run", async () => {
    enqueueTakenDates("2026-08-06", "2026-08-07");
    await PATCH(makeReq("PATCH", { action: "approve" }, { secret: CORRECT_SECRET }), params("5"));
    expect(scheduledDateWritten()).toBe("2026-08-08");
  });

  it("only counts rows already holding a date — pending rows have none", async () => {
    enqueueTakenDates(null, "2026-08-06", null);
    await PATCH(makeReq("PATCH", { action: "approve" }, { secret: CORRECT_SECRET }), params("5"));
    expect(scheduledDateWritten()).toBe("2026-08-07");
  });

  it("reports the assigned date back to the caller", async () => {
    enqueueTakenDates();
    const res = await PATCH(
      makeReq("PATCH", { action: "approve" }, { secret: CORRECT_SECRET }),
      params("5"),
    );
    expect(await res.json()).toEqual({ ok: true, scheduled_date: "2026-08-06" });
  });

  it("honours an admin-supplied future date instead of auto-assigning", async () => {
    enqueueTakenDates();
    const res = await PATCH(
      makeReq("PATCH", { action: "approve", scheduled_date: "2026-12-25" }, { secret: CORRECT_SECRET }),
      params("5"),
    );
    expect(res.status).toBe(200);
    expect(scheduledDateWritten()).toBe("2026-12-25");
  });

  it("rejects an override for today — a puzzle never lands on a day in progress", async () => {
    const res = await PATCH(
      makeReq("PATCH", { action: "approve", scheduled_date: TODAY }, { secret: CORRECT_SECRET }),
      params("5"),
    );
    expect(res.status).toBe(400);
    expect(_calls.find((c) => c.op === "update")).toBeUndefined();
  });

  it("rejects an override for a past date — that day has already happened", async () => {
    const res = await PATCH(
      makeReq("PATCH", { action: "approve", scheduled_date: "2026-01-01" }, { secret: CORRECT_SECRET }),
      params("5"),
    );
    expect(res.status).toBe(400);
    expect(_calls.find((c) => c.op === "update")).toBeUndefined();
  });

  it("rejects a malformed override rather than writing garbage to a date column", async () => {
    const res = await PATCH(
      makeReq("PATCH", { action: "approve", scheduled_date: "25/12/2026" }, { secret: CORRECT_SECRET }),
      params("5"),
    );
    expect(res.status).toBe(400);
    expect(_calls.find((c) => c.op === "update")).toBeUndefined();
  });

  it("returns 500 when the schedule read fails, without approving", async () => {
    _queue.push({ data: null, error: { message: "db fail" } });
    const res = await PATCH(
      makeReq("PATCH", { action: "approve" }, { secret: CORRECT_SECRET }),
      params("5"),
    );
    expect(res.status).toBe(500);
    expect(_calls.find((c) => c.op === "update")).toBeUndefined();
  });

  it("does not schedule Stavrolekso — its rows are never consumed", async () => {
    // Stavrolekso approvals are permanent and undated: players browse the whole
    // approved pool rather than being served one puzzle per day, so the table has
    // no scheduled_date column at all.
    const STAVRO = createReviewHandler({ table: "community_stavrolekso_puzzles" });
    const res = await STAVRO(
      makeReq("PATCH", { action: "approve" }, { secret: CORRECT_SECRET }),
      params("5"),
    );
    expect(res.status).toBe(200);

    const update = _calls.find((c) => c.op === "update");
    expect(update?.args[0]).toEqual({ status: "approved" });
    expect(_calls.find((c) => c.op === "select")).toBeUndefined();
    expect(await res.json()).toEqual({ ok: true });
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
