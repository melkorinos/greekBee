// nominationsRoute.test.ts — unit tests for all four nomination route files:
//   GET/POST  /api/nominations
//   GET       /api/nominations/lookup
//   POST      /api/nominations/[id]/vote
//   POST      /api/nominations/[id]/review

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

type ChainResult = { data?: unknown; error?: { message: string; code?: string } | null; count?: number | null };

let _callQueue: ChainResult[] = [];

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.select      = ret;
  chain.eq          = ret;
  chain.order       = ret;
  chain.in          = ret;
  chain.update      = ret;
  chain.delete      = ret;
  chain.insert      = () => Promise.resolve(result);
  chain.maybeSingle = () => Promise.resolve(result);
  chain.then        = (resolve: (v: ChainResult) => void) => resolve(result);
  return chain;
}

vi.mock("@/lib/supabase", () => {
  const client = {
    from: () => {
      const result = _callQueue.shift() ?? { data: null, error: null, count: null };
      return makeChain(result);
    },
  };
  // The review route uses the service-role client (RLS bypass); everything else
  // uses the anon client. Both resolve to the same queue-backed mock here.
  return {
  table: (c: { from: (n: string) => unknown }, n: string) => c.from(n),
    getSupabaseClient:      () => client,
    getServiceRoleClient:   () => client,
  };
});

vi.stubEnv("ADMIN_SECRET", "secret-admin");

// Import all four route handlers after mock is hoisted.
const { GET: listNominations, POST: submitNomination } =
  await import("@/app/api/nominations/route");

const { GET: lookupNomination } =
  await import("@/app/api/nominations/lookup/route");

const { POST: voteOnNomination } =
  await import("@/app/api/nominations/[id]/vote/route");

const { POST: reviewNomination } =
  await import("@/app/api/nominations/[id]/review/route");

// ── Helpers ───────────────────────────────────────────────────────────────────

function enqueue(...results: ChainResult[]) { _callQueue.push(...results); }

function makePost(url: string, body: unknown, adminSecret?: string) {
  return new NextRequest(url, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      // The admin gate reads the header, never the body (requireAdmin).
      ...(adminSecret === undefined ? {} : { "X-Admin-Secret": adminSecret }),
    },
    body: JSON.stringify(body),
  });
}

function withParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => { _callQueue = []; });
afterEach(()  => { _callQueue = []; });

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/nominations
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/nominations — validation", () => {
  it("400 when direction is missing", async () => {
    const res = await listNominations(new NextRequest("http://localhost/api/nominations"));
    expect(res.status).toBe(400);
  });

  it("400 when direction is not 'add' or 'remove'", async () => {
    const res = await listNominations(
      new NextRequest("http://localhost/api/nominations?direction=invalid"),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/nominations — happy path", () => {
  const makeReq = (dir: string) =>
    new NextRequest(`http://localhost/api/nominations?direction=${dir}`);

  it("returns [] when there are no pending nominations", async () => {
    enqueue({ data: [], error: null }); // nominations query
    const res = await listNominations(makeReq("add"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("merges vote counts into nomination list", async () => {
    enqueue({
      data: [{ id: "n1", word: "καλος", player_name: "Α", note: null, created_at: "2026-01-01" }],
      error: null,
    }); // nominations
    enqueue({
      data: [
        { nomination_id: "n1", vote_type: "up" },
        { nomination_id: "n1", vote_type: "up" },
        { nomination_id: "n1", vote_type: "down" },
      ],
      error: null,
    }); // votes
    const res   = await listNominations(makeReq("add"));
    const body  = (await res.json()) as Array<{ upvote_count: number; downvote_count: number }>;
    expect(res.status).toBe(200);
    expect(body[0].upvote_count).toBe(2);
    expect(body[0].downvote_count).toBe(1);
  });

  it("500 when nominations DB query fails", async () => {
    enqueue({ data: null, error: { message: "db error" } });
    const res = await listNominations(makeReq("remove"));
    expect(res.status).toBe(500);
  });

  it("stamps my_vote from this device's votes when deviceId is supplied", async () => {
    enqueue({
      data: [
        { id: "n1", word: "καλος", player_name: null, note: null, created_at: "2026-01-02" },
        { id: "n2", word: "ωραιος", player_name: null, note: null, created_at: "2026-01-01" },
      ],
      error: null,
    }); // nominations
    enqueue({
      data: [
        { nomination_id: "n1", vote_type: "up" },
        { nomination_id: "n2", vote_type: "down" },
      ],
      error: null,
    }); // aggregate votes
    enqueue({
      data: [{ nomination_id: "n1", vote_type: "up" }],
      error: null,
    }); // this device's votes
    const res  = await listNominations(
      new NextRequest("http://localhost/api/nominations?direction=add&deviceId=d1"),
    );
    const body = (await res.json()) as Array<{ id: string; my_vote: "up" | "down" | null }>;
    const byId = Object.fromEntries(body.map((n) => [n.id, n.my_vote]));
    expect(byId.n1).toBe("up");   // this device voted up
    expect(byId.n2).toBeNull();   // a vote exists but not from this device
  });

  it("my_vote is null for every row when no deviceId is supplied", async () => {
    enqueue({
      data: [{ id: "n1", word: "καλος", player_name: null, note: null, created_at: "2026-01-01" }],
      error: null,
    }); // nominations
    enqueue({ data: [{ nomination_id: "n1", vote_type: "up" }], error: null }); // votes
    const res  = await listNominations(makeReq("add"));
    const body = (await res.json()) as Array<{ my_vote: "up" | "down" | null }>;
    expect(body[0].my_vote).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/nominations
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/nominations — validation", () => {
  it("400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/nominations", {
      method: "POST", body: "{bad", headers: { "Content-Type": "application/json" },
    });
    expect((await submitNomination(req)).status).toBe(400);
  });

  it("400 when word is missing", async () => {
    const res = await submitNomination(makePost("http://localhost/api/nominations", {
      direction: "add", deviceId: "d1",
    }));
    expect(res.status).toBe(400);
  });

  it("400 when direction is invalid", async () => {
    const res = await submitNomination(makePost("http://localhost/api/nominations", {
      word: "καλος", direction: "edit", deviceId: "d1",
    }));
    expect(res.status).toBe(400);
  });

  it("400 when deviceId is missing", async () => {
    const res = await submitNomination(makePost("http://localhost/api/nominations", {
      word: "καλος", direction: "add",
    }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/nominations — happy path", () => {
  it("201 on successful insert", async () => {
    enqueue({ error: null });
    const res = await submitNomination(makePost("http://localhost/api/nominations", {
      word: "Καλός", direction: "add", deviceId: "d1",
    }));
    expect(res.status).toBe(201);
    expect((await res.json()).ok).toBe(true);
  });

  it("500 on DB error", async () => {
    enqueue({ error: { message: "insert failed" } });
    const res = await submitNomination(makePost("http://localhost/api/nominations", {
      word: "καλος", direction: "add", deviceId: "d1",
    }));
    expect(res.status).toBe(500);
  });

  it("422 when adding a blocklisted proper noun (no insert attempted)", async () => {
    // Μαρία is one of the ~17k curated-out proper nouns. No DB row is enqueued —
    // the route must short-circuit before touching Supabase.
    const res = await submitNomination(makePost("http://localhost/api/nominations", {
      word: "Μαρία", direction: "add", deviceId: "d1",
    }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("blocked_word");
  });

  it("allows REMOVING a blocklisted word (block is add-only)", async () => {
    enqueue({ error: null }); // insert succeeds
    const res = await submitNomination(makePost("http://localhost/api/nominations", {
      word: "Μαρία", direction: "remove", deviceId: "d1",
    }));
    expect(res.status).toBe(201);
  });

  it("409 already_pending with the existing id when the pending-unique backstop fires", async () => {
    // 23505 from nominations_pending_word_direction_key: an identical pending
    // proposal landed between the client's lookup and this POST.
    enqueue({ error: { message: "duplicate key value", code: "23505" } }); // insert conflict
    enqueue({ data: { id: "nom-9" }, error: null });                       // existing pending row
    const res = await submitNomination(makePost("http://localhost/api/nominations", {
      word: "καλος", direction: "add", deviceId: "d1",
    }));
    expect(res.status).toBe(409);
    const json = await res.json() as { error: string; pendingId: string | null };
    expect(json.error).toBe("already_pending");
    expect(json.pendingId).toBe("nom-9");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/nominations/lookup
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/nominations/lookup — validation", () => {
  it("400 when word is missing", async () => {
    const res = await lookupNomination(
      new NextRequest("http://localhost/api/nominations/lookup?direction=add"),
    );
    expect(res.status).toBe(400);
  });

  it("400 when direction is invalid", async () => {
    const res = await lookupNomination(
      new NextRequest("http://localhost/api/nominations/lookup?word=test&direction=invalid"),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/nominations/lookup — happy path", () => {
  function makeReq(word: string, dir: string) {
    return new NextRequest(
      `http://localhost/api/nominations/lookup?word=${encodeURIComponent(word)}&direction=${dir}`,
    );
  }

  it("returns rejected, accepted and pending counts", async () => {
    enqueue({ count: 2, error: null }); // rejected count
    enqueue({ count: 3, error: null }); // accepted count
    enqueue({ count: 1, error: null }); // pending count
    const res  = await lookupNomination(makeReq("καλος", "add"));
    const json = await res.json() as { rejected: number; accepted: number; pending: number; word: string };
    expect(res.status).toBe(200);
    expect(json.rejected).toBe(2);
    expect(json.accepted).toBe(3);
    expect(json.pending).toBe(1);
    expect(json.word).toBe("καλοσ"); // normalised: final sigma ς → σ
  });

  it("returns the earliest pending id so the client can upvote it instead of duplicating", async () => {
    enqueue({ count: 0, error: null });                                // rejected count
    enqueue({ count: 0, error: null });                                // accepted count
    enqueue({ data: [{ id: "nom-1" }, { id: "nom-2" }], count: 2, error: null }); // pending rows
    const res  = await lookupNomination(makeReq("καλος", "add"));
    const json = await res.json() as { pending: number; pendingId: string | null };
    expect(json.pending).toBe(2);
    expect(json.pendingId).toBe("nom-1");
  });

  it("returns pendingId null when nothing is pending", async () => {
    enqueue({ count: 0, error: null });               // rejected count
    enqueue({ count: 0, error: null });               // accepted count
    enqueue({ data: [], count: 0, error: null });     // pending rows
    const res  = await lookupNomination(makeReq("καλος", "add"));
    const json = await res.json() as { pendingId: string | null };
    expect(json.pendingId).toBeNull();
  });

  it("normalises word to lowercase+trim before querying", async () => {
    enqueue({ count: 0, error: null });
    enqueue({ count: 0, error: null });
    enqueue({ count: 0, error: null });
    const res  = await lookupNomination(makeReq("  Καλός  ", "remove"));
    const json = await res.json() as { word: string };
    // normalizeLetters: lowercased, accents stripped, final sigma ς → σ.
    expect(json.word).toBe("καλοσ");
  });

  it("returns blocked=true for a blocklisted add-word without querying the DB", async () => {
    // No counts enqueued — a blocked add-word must short-circuit before Supabase.
    const res  = await lookupNomination(makeReq("Αθήνα", "add"));
    const json = await res.json() as { blocked: boolean; word: string };
    expect(json.blocked).toBe(true);
    expect(json.word).toBe("αθηνα");
  });

  it("blocked=false for a normal add-word", async () => {
    enqueue({ count: 0, error: null }); // rejected
    enqueue({ count: 0, error: null }); // accepted
    enqueue({ data: [], count: 0, error: null }); // pending
    const res  = await lookupNomination(makeReq("καλος", "add"));
    const json = await res.json() as { blocked: boolean };
    expect(json.blocked).toBe(false);
  });

  it("500 when either count query fails", async () => {
    enqueue({ count: null, error: { message: "db error" } });
    enqueue({ count: 0,    error: null });
    const res = await lookupNomination(makeReq("καλος", "add"));
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/nominations/[id]/vote
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/nominations/[id]/vote — validation", () => {
  const url = "http://localhost/api/nominations/n1/vote";

  it("400 on invalid JSON", async () => {
    const req = new NextRequest(url, { method: "POST", body: "{bad", headers: { "Content-Type": "application/json" } });
    expect((await voteOnNomination(req, withParams("n1"))).status).toBe(400);
  });

  it("400 when deviceId is missing", async () => {
    const res = await voteOnNomination(makePost(url, { voteType: "up" }), withParams("n1"));
    expect(res.status).toBe(400);
  });

  it("400 when voteType is invalid", async () => {
    const res = await voteOnNomination(makePost(url, { deviceId: "d1", voteType: "meh" }), withParams("n1"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/nominations/[id]/vote — happy path", () => {
  const url = "http://localhost/api/nominations/n1/vote";

  it("201 added — new vote inserted when device has not voted before", async () => {
    enqueue({ data: null, error: null }); // maybeSingle → no existing vote
    enqueue({ error: null });             // insert
    const res = await voteOnNomination(makePost(url, { deviceId: "d1", voteType: "up" }), withParams("n1"));
    expect(res.status).toBe(201);
    expect((await res.json()).action).toBe("added");
  });

  it("200 removed — same voteType undoes the vote", async () => {
    enqueue({ data: { id: "v1", vote_type: "up" }, error: null }); // existing up vote
    enqueue({ error: null });                                        // delete
    const res = await voteOnNomination(makePost(url, { deviceId: "d1", voteType: "up" }), withParams("n1"));
    expect(res.status).toBe(200);
    expect((await res.json()).action).toBe("removed");
  });

  it("200 switched — opposite voteType flips the vote", async () => {
    enqueue({ data: { id: "v1", vote_type: "up" }, error: null }); // existing up vote
    enqueue({ error: null });                                        // update to down
    const res = await voteOnNomination(makePost(url, { deviceId: "d1", voteType: "down" }), withParams("n1"));
    expect(res.status).toBe(200);
    expect((await res.json()).action).toBe("switched");
  });

  it("defaults voteType to 'up' when not supplied", async () => {
    enqueue({ data: null, error: null }); // no existing
    enqueue({ error: null });
    const res = await voteOnNomination(makePost(url, { deviceId: "d1" }), withParams("n1"));
    expect(res.status).toBe(201);
  });

  it("500 on DB insert error", async () => {
    enqueue({ data: null, error: null });              // no existing
    enqueue({ error: { message: "insert fail" } });    // insert fails
    const res = await voteOnNomination(makePost(url, { deviceId: "d1", voteType: "up" }), withParams("n1"));
    expect(res.status).toBe(500);
  });

  it("500 when the existing-vote lookup errors — must NOT fall through to insert", async () => {
    // This was the compounding bug: a multiplicity error from maybeSingle left
    // `existing` null and the route inserted a third row. If the route (wrongly)
    // fell through, the insert would dequeue a default success and answer 201.
    enqueue({ data: null, error: { message: "multiple rows returned" } });
    const res = await voteOnNomination(makePost(url, { deviceId: "d1", voteType: "up" }), withParams("n1"));
    expect(res.status).toBe(500);
  });

  it("201 added when a concurrent insert of the same voteType wins the race (23505)", async () => {
    enqueue({ data: null, error: null });                            // no existing vote
    enqueue({ error: { message: "duplicate key", code: "23505" } }); // insert loses the race
    enqueue({ data: { id: "v1", vote_type: "up" }, error: null });   // re-read the raced row
    const res = await voteOnNomination(makePost(url, { deviceId: "d1", voteType: "up" }), withParams("n1"));
    expect(res.status).toBe(201);
    expect((await res.json()).action).toBe("added");
  });

  it("200 switched when the raced row holds the opposite voteType (23505)", async () => {
    enqueue({ data: null, error: null });                            // no existing vote
    enqueue({ error: { message: "duplicate key", code: "23505" } }); // insert loses the race
    enqueue({ data: { id: "v1", vote_type: "down" }, error: null }); // raced row is a down-vote
    enqueue({ error: null });                                        // update to up
    const res = await voteOnNomination(makePost(url, { deviceId: "d1", voteType: "up" }), withParams("n1"));
    expect(res.status).toBe(200);
    expect((await res.json()).action).toBe("switched");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/nominations/[id]/review
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/nominations/[id]/review — auth", () => {
  const url = "http://localhost/api/nominations/n1/review";

  // Auth is the shared envelope's (requireAdmin, exercised exhaustively in
  // apiRoute.test.ts). What matters here is that this route is behind it, and on
  // the platform's terms: the header, answered 401 — not the `adminSecret` body
  // field answered 403 that it used to have.
  it("401 when the admin secret is wrong", async () => {
    const res = await reviewNomination(
      makePost(url, { action: "approve" }, "wrong"),
      withParams("n1"),
    );
    expect(res.status).toBe(401);
  });

  it("401 when the admin secret header is missing", async () => {
    const res = await reviewNomination(
      makePost(url, { action: "approve" }),
      withParams("n1"),
    );
    expect(res.status).toBe(401);
  });

  it("401 when the secret is sent the old way, in the body", async () => {
    const res = await reviewNomination(
      makePost(url, { action: "approve", adminSecret: "secret-admin" }),
      withParams("n1"),
    );
    expect(res.status).toBe(401);
  });
});

describe("POST /api/nominations/[id]/review — validation", () => {
  const url = "http://localhost/api/nominations/n1/review";

  it("400 on invalid JSON", async () => {
    const req = new NextRequest(url, {
      method:  "POST",
      body:    "{bad",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": "secret-admin" },
    });
    expect((await reviewNomination(req, withParams("n1"))).status).toBe(400);
  });

  it("400 when action is not approve or reject", async () => {
    const res = await reviewNomination(
      makePost(url, { action: "delete" }, "secret-admin"),
      withParams("n1"),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/nominations/[id]/review — happy path", () => {
  const url    = "http://localhost/api/nominations/n1/review";
  const SECRET = "secret-admin";

  it("200 ok on approve", async () => {
    enqueue({ error: null });
    const res = await reviewNomination(makePost(url, { action: "approve" }, SECRET), withParams("n1"));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("200 ok on reject", async () => {
    enqueue({ error: null });
    const res = await reviewNomination(makePost(url, { action: "reject" }, SECRET), withParams("n1"));
    expect(res.status).toBe(200);
  });

  it("500 on DB error, without leaking the Postgres message", async () => {
    enqueue({ error: { message: "relation \"nominations\" does not exist" } });
    const res = await reviewNomination(makePost(url, { action: "approve" }, SECRET), withParams("n1"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "db_error" });
  });
});
