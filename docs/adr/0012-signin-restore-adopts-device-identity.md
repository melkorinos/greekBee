# ADR 0012 — Sign-in Restore adopts the account's DeviceId (auth account becomes the identity anchor)

**Status**: Accepted — supersedes the merge behaviour of ADR 0007 (its anonymous-first stance stands)

## Context

ADR 0007 made Google OAuth *augment* device identity: sign-in stamps `auth_user_id` onto the current device's `player_profiles` row, forward-only. It never defined what happens when the same Google account signs in on a **second** device that has its own profile row. The schema's unique partial index on `player_profiles.auth_user_id` makes that case a hard failure today: the upsert in `/api/auth/link` violates uniqueness → 500. So returning players cannot actually restore their identity on a new device — which blocks achievements, since achievements are worthless if losable.

## Decision

The auth account is the durable identity anchor; a device is one session of it. On sign-in, when the Google account already has a linked profile, the device performs **Sign-in Restore**:

1. The device **adopts** the linked profile's `device_uuid` locally — the same mechanic TransferCode claim already uses. One profile row per person; the unique index on `auth_user_id` stays as a correctness guarantee.
2. Pre-existing local history is **merged**: the device's old `game_scores` are re-pointed to the adopted identity; where both identities have a row for the same `(game_id, puzzle_date[, word_length])`, the **best score wins** (consistent with the leaderboard's silent-upsert-on-increase rule). The account profile's DisplayName wins. The device's old profile row is deleted.
3. Restore guarantees identity + history. Live in-progress sessions transfer only where sync already exists (Leksokipos dailies via `game_state`); other games' sessions stay device-local. No new session-sync machinery.
4. The merge is **silent** (toast, no confirmation dialog) — it is a union, nothing is ever discarded, so a confirmation protects against nothing.
5. **Disconnect** (profile disconnect *and* Google sign-out — one concept) issues a fresh DeviceId and clears local state. A device holding an adopted identity must not leak it to the next person at a shared computer. Nothing server-side is deleted; signing back in restores everything.
6. The restore and link endpoints are a **real security boundary**: `auth_user_id` is derived server-side from the verified Supabase JWT (`auth.uid()`), never taken from the request body. (The pre-existing `/api/auth/link` trusts the body today — it must be fixed to this standard.) This is account takeover territory, not score-cheating territory; the platform's relaxed trust model does not apply here.

## Considered Options

- **Umbrella model** — drop the unique index, many profile rows share one `auth_user_id`. Rejected: every read must aggregate across the set, DisplayName must be synced across N rows, and every existing device-keyed query changes.
- **Pick a winner / block second sign-in** — rejected: silently discarding anonymous history poisons lifetime stats, and blocking kills the point (sign-in *is* the return path).

## Consequences

- "DeviceId is unique per browser" is no longer an invariant (TransferCode claim had already broken it); one DeviceId identifies all of a player's browsers.
- TransferCode is retained indefinitely as the no-account fallback and is now load-bearing: Sign-in Restore is "TransferCode claim keyed by Google."
- Achievements can be keyed by `device_uuid`, earned anonymously (losable until AuthLinked — surfaced in the UI as a sign-in motivator), stored as immutable idempotent rows (`(device_uuid, achievement_id)` unique, `earned_at` never revoked). Merges cannot double-count because awards are facts, not counters.
- Achievement **awarding follows the platform's existing trust model** (client-detected, server-recorded, idempotent — same accepted risk as client-posted scores). The **catalog lives in code** (pure predicate functions per game, platform-wide ones shared); only earned facts live in the DB. Achievement IDs are frozen strings once shipped — renaming orphans earned rows (same precedent as Puzzle IDs).
- `game_scores` becomes **append-forever** (recorded in CONTEXT.md): lifetime stats and streaks derive from it, so pruning would silently corrupt them.
- **Amendment (2026-07-04): `game_scores.auth_user_id` dropped.** It had zero readers (leaderboard, lifetime stats, and this ADR's restore-merge all key off `device_id`; the authoritative device→account map is the unique `auth_user_id` on `player_profiles`). Its only writer was a link-time back-fill, so any score posted while *already* signed in stayed null. It was also a live foot-gun: the `scores_update` policy `(auth_user_id IS NULL OR auth_user_id = auth.uid())` plus the anon write client (`auth.uid()` null server-side) made a stamped row un-updatable, freezing a signed-in player's score improvements. Migration `20260704120000` drops the column (+ its FK and partial index) and simplifies `scores_update` to `USING (true)` — consistent with §6 (scores are not a security boundary) and the already-open insert/select policies. Sign-in Restore re-points history by `device_id` alone; the link route no longer touches `game_scores`.
- **Admin Restore** is a break-glass SQL recipe (`docs/admin-restore.md`): email → `auth_user_id` → `device_uuid` → insert a TransferCode the player claims normally. Disconnect is local-only (nothing server-side is deleted), so the `player_profiles` mapping survives it — the events that actually destroy the email→device hop are *link-time*: a sign-in on a device still holding someone else's linked `device_uuid` overwrites that row's `auth_user_id` (fresh account) or merges-and-deletes the row (existing anchor). Mitigation: an append-only `identity_audit` log `(auth_user_id, device_uuid, at)` written server-side by `/api/auth/link` whenever a link establishes a mapping that differs from what the profile row held, so every mapping that ever existed is reconstructable. (Corrected 2026-07-03: an earlier revision placed this log at Google *disconnect*, which records a pair the DB still holds and misses the destructive events.)
- Google sign-in must be offered wherever ProfileSection renders and the device is not AuthLinked — as a rule, not a per-call-site choice (`onSignIn` becomes required in `LeaderboardProfileSlot`). ADR 0007's Consequences claimed the per-game LeaderboardModal already contained the sign-in button; the code contradicted this (only the landing-page 🏆 wired auth). This ADR makes that claim true by construction.
- Never hardcode `"google"` where a provider name flows — Facebook is a plausible later toggle.
