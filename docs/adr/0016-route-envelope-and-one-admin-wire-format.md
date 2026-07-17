# ADR 0016 — One route envelope: parse, admin guard, and two error channels

**Status**: Accepted

## Context

Every `/api` route does the same three things before its own logic, and each had improvised them independently.

**Admin auth existed in two incompatible shapes.** `/api/community-puzzles/*` took an `x-admin-secret` header and answered 401; `/api/nominations/[id]/review` took an `adminSecret` field in the request body and answered 403. Same concept, two wire formats, two status codes, two implementations of the comparison — and the body-field variant put a long-lived secret somewhere it is far more likely to be logged or cached than a header.

**Error bodies leaked implementation detail.** ~15 sites returned `{ error: error.message }` — the raw Postgres message — straight to the client. `gameScoresRoute.test.ts` asserted `json.error === "DB exploded"`, pinning the leak in place as though it were a requirement.

**The `req.json()` try/catch guard was hand-copied in ~10 routes**, half answering `"Invalid JSON"` and half `"invalid_json"` — the same failure spelled two ways on the wire.

The through-line: there was no seam for what every route does *before* its real work, so each route re-decided it. `communityPuzzleLifecycle` had already grown its own private copies (`isAdmin`, a parse guard) for the 9 community-puzzle routes — evidence the seam wanted to exist, one layer too low to be reused.

The complication is that `{ error: string }` is **not** a single channel. Some strings are implementation detail (raw Postgres). Some are stable codes the client switches on (`blocked_word`). And some are player-facing copy: `/api/transfer/claim` returns Greek sentences that `useProfile.claimTransferCode` throws and the UI renders verbatim, and the community submit modals render `json.error` into the form. A naive "replace every error body with a code" would have silently blanked the player's explanation of why their transfer code failed.

## Decision

**One envelope module, `src/lib/apiRoute.ts`, owns the pre-logic concerns; routes keep only their own logic.**

- `parseJson<T>(req)` — body + the 400 guard, answering the single code `invalid_json`. Returns a discriminated union; the route does `if (!parsed.ok) return parsed.response`. It asserts `T`, it does not validate it — field checks stay in the route, where the caller-facing message belongs.
- `requireAdmin(req)` — **the `x-admin-secret` header is the one admin wire format, and a bad secret is always 401.** Returns `null` for the go-ahead. An unset `ADMIN_SECRET` denies everyone rather than letting an empty header match.
- **Two error channels, one body shape.** `{ error: string }` is unchanged on the wire; what the string *means* splits:
  - `jsonError(code, detail?)` — a stable code the envelope owns (`invalid_json`, `unauthorized`, `not_found`, `db_error`), each with one canonical status. `detail` is logged server-side and **dropped from the response** — that is what seals the leak.
  - `jsonMessage(text, status?)` — copy the route authors on purpose: field validation, domain codes like `blocked_word`, and the Greek strings the UI renders.

Picking between the two at each call site is the discipline the envelope buys: if you cannot name the code, you are probably about to leak something.

`/api/cleanup-scores` is **deliberately not migrated** to `jsonError`. It is cron-only behind `CRON_SECRET`; its Postgres messages go to Vercel, not to a player. That is a diagnostic, not a leak, and sealing it would cost debuggability for nothing.

## Consequences

- **A breaking change to `/api/nominations/[id]/review`**, taken deliberately rather than kept behind a compat shim: the secret moves body → header and 403 → 401. Client and server ship in the same Next.js deploy and there are no external API consumers, so a compat window would have bought only the permanent survival of the second shape. `NominationCard` moves with the route; `requireAdmin`'s tests assert the body-borne secret no longer works, so the old shape cannot quietly come back.
- **Error-body churn is real but bounded**: `"Invalid JSON"` → `invalid_json`, raw PG messages → `db_error`, auth/link's "Missing bearer token"/"Invalid token" → one `unauthorized` (telling an unauthenticated caller which of the two it was only helps an attacker). Player-facing copy is untouched.
- **Two tests changed meaning rather than being fixed**: the assertions on `"DB exploded"` and `"Invalid JSON"` described the defect, not a requirement.
- The envelope is tested once (`apiRoute.test.ts`) instead of per route; route tests assert their own logic and merely that they sit behind the gate.
- `jsonError`'s code list is small and closed on purpose. A route needing a status the envelope doesn't own (`403`, `410`, `422`) goes through `jsonMessage`, which keeps envelope-owned and route-owned strings distinguishable. If the code vocabulary starts growing to cover route-specific domain failures, that is the signal this split needs revisiting — not a reason to widen the enum quietly.
