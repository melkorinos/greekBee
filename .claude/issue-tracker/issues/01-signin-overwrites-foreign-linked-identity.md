# Sign-in on a device holding someone else's linked identity silently overwrites or absorbs it

Status: needs-triage

## What happens

`/api/auth/link` (`src/app/api/auth/link/route.ts`) keys its profile upsert on `device_uuid`. Shared-computer scenario: player A walks away without Disconnecting, so the device still holds A's canonical `device_uuid`. Player B signs in with their own Google account:

- **B has no existing anchor** (first sign-in): step 6 upserts `{ device_uuid: A-canonical, auth_user_id: B }` — A's `auth_user_id` is overwritten on A's own profile row. A's email→device mapping is severed; A's next sign-in finds no anchor and starts a fresh identity.
- **B has an anchor** (returning player): the restore branch merges A's `game_scores` into B's identity and deletes A's profile row entirely.

Either way A permanently loses their identity anchor without any confirmation, and B may silently absorb A's history.

## Why it's not fixed in slice 5

Slice 5's link-time `identity_audit` (grill decision 2026-07-03, see ADR 0012) makes these events *reconstructable* by an admin — it does not prevent them. Prevention is a product decision that changes Sign-in Restore semantics and deserves its own grill.

## Candidate direction (not decided)

When the device row's `auth_user_id` is set and differs from the verified caller's, refuse to touch that row; mint a fresh device identity for the caller instead (their own anchor, if any, still restores normally). Open questions: what happens to the device's local anonymous history in that case, and how the client learns it must adopt a fresh `device_uuid`.

## References

- ADR 0012 (`docs/adr/0012-signin-restore-adopts-device-identity.md`) — §5 Disconnect discipline is the current documented mitigation.
- `src/app/api/auth/link/route.ts` steps 3–6 and `restore()`.
