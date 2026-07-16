// pangramsRoute.test.ts — unit tests for POST /api/pangrams.
//
// Supabase is mocked; no real network. The write path is insert-if-absent
// (ON CONFLICT (device_uuid,puzzle_date,word) DO NOTHING) so a re-submitted find
// is a no-op; the response returns the device's fresh lifetime COUNT(*) so the
// client can detect a tier crossing in one round-trip (B2/R2). The server runs
// ZERO detection — it only writes the words the client posts, shape-bounded by
// sanitizePangramWords (covered in pangrams.test.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ─────────────────────────────────────────────────────────────

type ChainResult = { data?: unknown; count?: number | null; error?: { message: string } | null };

let _callQueue: ChainResult[] = [];
let _lastUpsert: { rows: unknown; options: unknown } | null = null;
let _lastEq: { column: string; value: unknown } | null = null;
let _lastSelect: { cols: unknown; opts: unknown } | null = null;

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  chain.select = (cols: unknown, opts: unknown) => { _lastSelect = { cols, opts }; return chain; };
  chain.eq = (column: string, value: unknown) => { _lastEq = { column, value }; return Promise.resolve(result); };
  chain.upsert = (rows: unknown, options: unknown) => { _lastUpsert = { rows, options }; return Promise.resolve(result); };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  table: (c: { from: (n: string) => unknown }, n: string) => c.from(n),
  getSupabaseClient: () => ({
    from: () => makeChain(_callQueue.shift() ?? { data: null, count: 0, error: null }),
  }),
}));

const { POST } = await import("@/app/api/pangrams/route");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePostReq(body: unknown) {
  return new NextRequest("http://localhost/api/pangrams", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

function enqueue(...results: ChainResult[]) { _callQueue.push(...results); }

beforeEach(() => { _callQueue = []; _lastUpsert = null; _lastEq = null; _lastSelect = null; });
afterEach(()  => { _callQueue = []; _lastUpsert = null; _lastEq = null; _lastSelect = null; });

const VALID_POST = {
  device_uuid: "device-1",
  puzzle_date: "2026-07-06",
  words:       ["παρακολουθηση"],
};

// ── happy path ──────────────────────────────────────────────────────────────

describe("POST /api/pangrams — happy path", () => {
  it("insert-if-absents the finds and returns the device's fresh lifetime count", async () => {
    enqueue({ error: null });            // upsert
    enqueue({ count: 3, error: null });  // COUNT(*)
    const res = await POST(makePostReq(VALID_POST));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 3 });

    // ON CONFLICT DO NOTHING on the composite key — a re-submitted find is a no-op.
    expect(_lastUpsert?.options).toMatchObject({
      onConflict:       "device_uuid,puzzle_date,word",
      ignoreDuplicates: true,
    });
    expect(_lastUpsert?.rows).toEqual([
      { device_uuid: "device-1", puzzle_date: "2026-07-06", word: "παρακολουθηση" },
    ]);
    // Count is a HEAD exact count scoped to the device (lifetime, all dates).
    expect(_lastSelect?.opts).toMatchObject({ count: "exact", head: true });
    expect(_lastEq).toEqual({ column: "device_uuid", value: "device-1" });
  });

  it("normalizes and shape-filters words before writing (only real pangrams reach the table)", async () => {
    enqueue({ error: null });
    enqueue({ count: 1, error: null });
    const res = await POST(makePostReq({
      device_uuid: "device-1",
      puzzle_date: "2026-07-06",
      words:       ["Παρακολούθηση", "γατα", "<script>"],
    }));
    expect(res.status).toBe(200);
    expect(_lastUpsert?.rows).toEqual([
      { device_uuid: "device-1", puzzle_date: "2026-07-06", word: "παρακολουθηση" },
    ]);
  });

  it("skips the write but still returns the current count when no valid pangram is posted", async () => {
    enqueue({ count: 5, error: null }); // only the COUNT(*) query runs
    const res = await POST(makePostReq({
      device_uuid: "device-1",
      puzzle_date: "2026-07-06",
      words:       ["γατα", "σπιτι"],
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 5 });
    expect(_lastUpsert).toBeNull();
  });
});

// ── validation ────────────────────────────────────────────────────────────────

describe("POST /api/pangrams — validation", () => {
  it("400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/pangrams", {
      method: "POST", body: "{bad", headers: { "Content-Type": "application/json" },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("400 when device_uuid is missing", async () => {
    const res = await POST(makePostReq({ ...VALID_POST, device_uuid: undefined }));
    expect(res.status).toBe(400);
  });

  it("400 when puzzle_date is not an ISO date", async () => {
    const res = await POST(makePostReq({ ...VALID_POST, puzzle_date: "07/06/2026" }));
    expect(res.status).toBe(400);
    expect(_lastUpsert).toBeNull();
  });
});

// ── DB errors ─────────────────────────────────────────────────────────────────

describe("POST /api/pangrams — DB errors", () => {
  it("500 when the upsert returns an error", async () => {
    enqueue({ error: { message: "DB write failure" } });
    const res = await POST(makePostReq(VALID_POST));
    expect(res.status).toBe(500);
  });

  it("500 when the count query returns an error", async () => {
    enqueue({ error: null });                                 // upsert ok
    enqueue({ count: null, error: { message: "count failed" } }); // count fails
    const res = await POST(makePostReq(VALID_POST));
    expect(res.status).toBe(500);
  });
});
