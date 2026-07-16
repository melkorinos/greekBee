// apiRoute.ts — the route envelope: what every /api route does *before* its own logic.
//
// Three concerns that were hand-copied across the route tree, now owned here:
//   parseJson    — body parsing + the 400 guard (was try/catch'd in ~10 routes,
//                  half answering "Invalid JSON", half "invalid_json")
//   requireAdmin — the admin gate (was two incompatible wire formats: an
//                  x-admin-secret header → 401 in community-puzzles, an
//                  adminSecret body field → 403 in nominations review)
//   jsonError    — stable coded error bodies; implementation detail is logged,
//                  never sent (routes used to return raw Postgres messages)
//
// ── The two error channels ────────────────────────────────────────────────────
// Every error body on the wire stays `{ error: string }` — that shape is load-
// bearing and unchanged. What the string *means* now splits in two, and the
// split is the point:
//
//   jsonError(code)      A stable code the envelope owns. The client switches on
//                        it; it never carries implementation detail. Use this
//                        wherever a Postgres/network failure would otherwise leak.
//
//   jsonMessage(text)    Caller-facing copy the route deliberately authors —
//                        field validation ("device_uuid is required") and the
//                        Greek strings the UI renders verbatim (useProfile throws
//                        `err.error` for the player to read; the community submit
//                        modals render it into the form). These are contract, not
//                        leak, so they pass through untouched.
//
// Picking between them at each call site is the whole discipline: if you cannot
// name the code, you are probably about to leak something.

import { NextRequest, NextResponse } from "next/server";

// ── jsonError — stable coded failures ─────────────────────────────────────────

/** Wire codes the envelope owns. Each maps to exactly one status. */
export type ApiErrorCode =
  | "invalid_json"
  | "unauthorized"
  | "not_found"
  | "db_error";

const STATUS: Record<ApiErrorCode, number> = {
  invalid_json: 400,
  unauthorized: 401,
  not_found:    404,
  db_error:     500,
};

/**
 * A stable coded error. `detail` (a Postgres message, a thrown value) is logged
 * server-side and dropped from the response — that is what seals the leak, so
 * pass it rather than folding it into the body.
 */
export function jsonError(code: ApiErrorCode, detail?: unknown): NextResponse {
  if (detail !== undefined) {
    const text = detail instanceof Error ? detail.message : String(detail);
    console.error(`[api] ${code}: ${text}`);
  }
  return NextResponse.json({ error: code }, { status: STATUS[code] });
}

/**
 * Caller-facing copy the route authors on purpose — validation messages and the
 * Greek strings the UI renders. Defaults to 400, the status every current
 * validation site uses.
 */
export function jsonMessage(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// ── parseJson — body + the 400 guard ──────────────────────────────────────────

export type ParsedBody<T> =
  | { ok: true;  body: T }
  | { ok: false; response: NextResponse };

/**
 * Parse a JSON request body, answering `invalid_json` (400) on malformed input.
 *
 *   const parsed = await parseJson<Payload>(req);
 *   if (!parsed.ok) return parsed.response;
 *   const { field } = parsed.body;
 *
 * T is asserted, not validated — field checks stay in the route, where the
 * caller-facing message belongs.
 */
export async function parseJson<T>(req: NextRequest): Promise<ParsedBody<T>> {
  try {
    return { ok: true, body: (await req.json()) as T };
  } catch {
    return { ok: false, response: jsonError("invalid_json") };
  }
}

// ── requireAdmin — one admin wire format ──────────────────────────────────────

/**
 * The admin gate: an `x-admin-secret` header matching ADMIN_SECRET. Returns null
 * when authorized, or the 401 to return when not:
 *
 *   const denied = requireAdmin(req);
 *   if (denied) return denied;
 *
 * The header is the single wire format — /api/nominations/[id]/review used to
 * take the secret as a body field and answer 403. An unset ADMIN_SECRET denies
 * everyone rather than letting an empty header through.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_SECRET ?? "";
  const supplied = req.headers.get("x-admin-secret") ?? "";
  if (!expected || !supplied || supplied !== expected) {
    return jsonError("unauthorized");
  }
  return null;
}
