// apiRoute.test.ts — the route envelope, tested once instead of per route.
//
// The point of the envelope is that these behaviours have exactly one
// implementation, so this file is where they are pinned down: the routes'
// own tests assert their own logic, not the parse guard or the admin gate.

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { jsonError, jsonMessage, parseJson, requireAdmin } from "@/lib/apiRoute";

const ORIGINAL_SECRET = process.env.ADMIN_SECRET;

function makeReq(init?: { body?: string; headers?: Record<string, string> }): NextRequest {
  return new NextRequest("https://example.test/api/thing", {
    method:  "POST",
    headers: init?.headers,
    body:    init?.body,
  });
}

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.ADMIN_SECRET;
  else process.env.ADMIN_SECRET = ORIGINAL_SECRET;
  vi.restoreAllMocks();
});

// ── jsonError ─────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("answers each code with its canonical status and the code as the body", async () => {
    const cases = [
      ["invalid_json", 400],
      ["unauthorized", 401],
      ["not_found",    404],
      ["db_error",     500],
    ] as const;

    for (const [code, status] of cases) {
      const res = jsonError(code);
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error: code });
    }
  });

  it("logs the detail and keeps it out of the response — the leak this seals", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = jsonError("db_error", 'duplicate key value violates unique constraint "game_scores_pkey"');

    // The client learns only that the write failed.
    expect(await res.json()).toEqual({ error: "db_error" });
    // The operator still learns why.
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("game_scores_pkey"));
  });

  it("unwraps an Error detail rather than logging [object Object]", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    jsonError("db_error", new Error("connection refused"));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("connection refused"));
  });

  it("stays silent when there is no detail to log", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    jsonError("unauthorized");
    expect(spy).not.toHaveBeenCalled();
  });
});

// ── jsonMessage ───────────────────────────────────────────────────────────────

describe("jsonMessage", () => {
  it("passes route-authored copy through verbatim at 400 by default", async () => {
    const res = jsonMessage("device_uuid is required");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "device_uuid is required" });
  });

  it("carries Greek player-facing copy through unmangled at a chosen status", async () => {
    // useProfile throws this string for the player to read — the message channel
    // exists so it survives.
    const res = jsonMessage("Ο κωδικός έχει λήξει.", 410);
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ error: "Ο κωδικός έχει λήξει." });
  });
});

// ── parseJson ─────────────────────────────────────────────────────────────────

describe("parseJson", () => {
  it("returns the parsed body on well-formed JSON", async () => {
    const parsed = await parseJson<{ a: number }>(makeReq({ body: JSON.stringify({ a: 1 }) }));
    expect(parsed).toEqual({ ok: true, body: { a: 1 } });
  });

  it("answers invalid_json (400) on malformed JSON", async () => {
    const parsed = await parseJson(makeReq({ body: "{not json" }));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) throw new Error("expected a parse failure");
    expect(parsed.response.status).toBe(400);
    expect(await parsed.response.json()).toEqual({ error: "invalid_json" });
  });

  it("answers invalid_json on an empty body", async () => {
    const parsed = await parseJson(makeReq());
    expect(parsed.ok).toBe(false);
  });

  it("passes a JSON null/scalar through — shape checks belong to the route", async () => {
    // parseJson asserts T, it does not validate it. Routes own their field
    // checks so they can author the caller-facing message.
    const parsed = await parseJson(makeReq({ body: "null" }));
    expect(parsed).toEqual({ ok: true, body: null });
  });
});

// ── requireAdmin ──────────────────────────────────────────────────────────────

describe("requireAdmin", () => {
  beforeEach(() => { process.env.ADMIN_SECRET = "correct-horse"; });

  it("returns null — the go-ahead — for a matching x-admin-secret header", () => {
    expect(requireAdmin(makeReq({ headers: { "x-admin-secret": "correct-horse" } }))).toBeNull();
  });

  it("matches the header case-insensitively, as HTTP requires", () => {
    expect(requireAdmin(makeReq({ headers: { "X-Admin-Secret": "correct-horse" } }))).toBeNull();
  });

  it("denies a wrong secret with 401", async () => {
    const denied = requireAdmin(makeReq({ headers: { "x-admin-secret": "wrong" } }));
    expect(denied?.status).toBe(401);
    expect(await denied?.json()).toEqual({ error: "unauthorized" });
  });

  it("denies a missing header", () => {
    expect(requireAdmin(makeReq())?.status).toBe(401);
  });

  it("denies an empty header rather than treating it as absent", () => {
    expect(requireAdmin(makeReq({ headers: { "x-admin-secret": "" } }))?.status).toBe(401);
  });

  it("ignores a secret sent the old way, in the body", async () => {
    // The pre-envelope wire format for /api/nominations/[id]/review. It must not
    // still work, or the second shape has not actually gone away.
    const req = makeReq({ body: JSON.stringify({ action: "approve", adminSecret: "correct-horse" }) });
    expect(requireAdmin(req)?.status).toBe(401);
  });

  it("denies everyone when ADMIN_SECRET is unset — never fails open", () => {
    delete process.env.ADMIN_SECRET;
    // The dangerous case: an unset env var must not let an empty header match.
    expect(requireAdmin(makeReq({ headers: { "x-admin-secret": "" } }))?.status).toBe(401);
    expect(requireAdmin(makeReq())?.status).toBe(401);
    expect(requireAdmin(makeReq({ headers: { "x-admin-secret": "anything" } }))?.status).toBe(401);
  });

  it("denies everyone when ADMIN_SECRET is set to an empty string", () => {
    process.env.ADMIN_SECRET = "";
    expect(requireAdmin(makeReq({ headers: { "x-admin-secret": "" } }))?.status).toBe(401);
  });
});
