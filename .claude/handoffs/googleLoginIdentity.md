# Handoff: Sign-in Restore — Slices 1–4 DONE + committed; only slice 5 remains

**Date:** 2026-07-03
**Status:** **Slices 1–4 all implemented, green, and committed on `dev`** (slice 3 `e7058f0`, slice 4 `7d5c6f5`, + doc commits). Only slice 5 (`identity_audit` migration, prod push) remains. Working tree clean.
**Gates at handoff:** `1201 pass / 6 skipped · eslint 0 · build 0`.

## ▶ START HERE next session (two independent items, either order)
1. **Slice 5 — `identity_audit` migration** (see §Slice 5 below). Decided shape; it's a **prod DB push** → draft the SQL migration, **show the user + get explicit OK before `npx supabase db push`**. `/tdd` for the write-on-Disconnect wiring.
2. **Slice 3 known follow-up** — the Google sign-out path leaves `useGameIdentity`'s in-memory `deviceId` stale (details in §Slice 3 ⚠️). Small `/tdd` fix; decide reload-vs-callback. Epic B's profile disconnect button inherits this, so it can also be handled there.

Read **ADR 0012** first. Do not re-litigate settled decisions (below).

---

## Where the decisions live (do not re-litigate)

- **ADR 0012** (`docs/adr/0012-signin-restore-adopts-device-identity.md`) — the identity spine. Read first.
- **CONTEXT.md** — glossary: `Sign-in Restore`, `Disconnect`, `Achievement`, `Admin Restore`; `game_scores` append-forever.
- **ADR 0007** — superseded-in-part; anonymous-first stance stands.
- **`docs/admin-restore.md`** — break-glass SQL recipe.
- Session 57 in `.claude/aiHelper/log.md` — exactly what slices 1–2 changed.

## Session decisions already made (AskUserQuestion, do not re-ask)
- Security = **Bearer JWT + service-role** (not new RLS DELETE policy).
- Restore is **folded into `/api/auth/link`** (restore-aware), not a separate route.
- Welcome signal = **flag now, tiny toast later** (no toast infra exists).

## ✅ Slice 1 — DONE (security boundary)
`src/app/api/auth/link/route.ts`: derives `auth_user_id` + Google name from the verified JWT (`Authorization: Bearer` → `getSupabaseClient().auth.getUser(token)`), 401 on missing/invalid; body carries only `device_uuid`. Privileged writes via new shared **`getServiceRoleClient()`** in `src/lib/supabase.ts` (folded the `cleanup-scores` copy). Fixed latent bug: back-fill filtered nonexistent `game_scores.device_uuid` → now `device_id`. Callback sends the bearer token. Tests: `src/test/shared/authLinkRoute.test.ts` (intent-aware harness).

## ✅ Slice 2 — DONE (Sign-in Restore + merge)
- Pure `src/lib/scoreMerge.ts` `planScoreMerge(oldRows, canonicalRows)` → `{repoint, deleteOld, deleteCanonical}`; best score per `(game_id, puzzle_date)`, **loser row deleted** (keeps score↔`data` consistent). `src/test/shared/scoreMerge.test.ts` (7).
- `/api/auth/link` restore branch: anchor lookup by `auth_user_id`; if account lives on another device → `restore()` executes the plan (batched `.in("id",…)`), deletes old profile row, returns `{device_uuid: canonical, display_name, restored:true}`. Also fixes the old hard-500.
- Client: **`adoptDeviceIdentity(deviceId, name?)`** in `useGameStore` (atomic deviceId+name+profileLinked+authLinked). Callback (`src/app/auth/callback/page.tsx`) awaits the response, adopts when `device_uuid` differs, sets `leksokipos-needs-restore` + `signin-restore-welcome` (sessionStorage) flags. Tests: `useGameStore.test.ts` +5.

**Verification at handoff:** `npm run test -- --run` → **1194 pass / 6 skipped**, `npx eslint .` clean, `npm run build` exit 0.

---

## ✅ Slice 3 — DONE + committed (`e7058f0`) — Disconnect unification, 2026-07-03, test-first
**Pre-decision (user):** **Full reset** — Disconnect makes the device a brand-new anonymous player.
- New store fn **`disconnectIdentity()`** (renamed from `disconnectProfile`) writes `{ deviceId: crypto.randomUUID() }` — drops displayName, profileLinked, authLinked, **and every game slice** in one shot (slices live in the same envelope). Old `disconnectProfile` only swapped deviceId + kept displayName/slices (a lingering identity leak); that's gone.
- `useProfile.disconnect()` calls it and now also `onDisplayNameChange("")` so React state reflects the cleared name (already propagated the fresh deviceId).
- `useAuth.signOut()` now calls `disconnectIdentity()` too — Google sign-out **is** a full Disconnect, not just an authLinked clear.
- Tests updated to the new contract: `useGameStore.test.ts` (`disconnectIdentity` wipes slices / clears displayName+authLinked+profileLinked), `useProfile.test.ts` (asserts `onDisplayNameChange("")`), `useAuth.test.ts` (+1: signOut calls `disconnectIdentity`). README helper name updated. **1201 pass · eslint 0 · build 0.**

**⚠️ Known follow-up (not a blocker for slice 5):** the **Google sign-out path doesn't propagate the fresh deviceId into `useGameIdentity` React state** — `useAuth.signOut` has no `onDeviceIdChange`/`onDisplayNameChange` callbacks, so until the next remount/reload the in-memory `deviceId` is stale and a score posted in that window would attach to the *old* identity. The profile-disconnect path is fine (propagates via callbacks). Fix options: (a) reload/redirect on Google sign-out (jsdom can't navigate — untestable in unit tests), or (b) refresh `useGameIdentity` from the store at the sign-out call sites (HomeTrophyButton + 4 Boards). Decide when wiring the Profile page's disconnect button (Epic B inherits this path).

## ✅ Slice 4 — DONE + committed (`7d5c6f5`) — visibility rule, 2026-07-03, test-first
- `onSignIn` is now **required** in `LeaderboardProfileProps` (`useLeaderboardProfile.ts`) and `ProfileSectionProps` (`ProfileSection.tsx`) — compile-enforced at every call site, so a modal can never silently omit sign-in again.
- `ProfileSection` now offers **Σύνδεση με Google** in **`linked`** mode too (ProfileLinked-no-Google → upgrade path), not just `idle`; the now-redundant `onSignIn &&` guards were removed.
- Wired `useAuth` (`authLinked/authUserName/signInWithGoogle/signOut`) into all four in-game Boards — `GameBoard.tsx`, `LeksiarxeioBoard.tsx`, `ConnectionsBoard.tsx`, `VresTinFrasiBoard.tsx` — which previously passed no auth props (only `HomeTrophyButton` did). No `"google"` hardcoded anywhere; the provider flows through `useAuth`.
- Tests: new `src/test/shared/profileSectionSignIn.test.tsx` (4: linked/idle offer sign-in, click calls `onSignIn`, hidden+sign-out when AuthLinked). Harness fixes: `leaderboardModal.test.tsx` + `useLeaderboardProfile.test.ts` defaults gain `onSignIn`; `GameBoard.test.tsx` stubs `useAuth` (it renders a full board). **Verification: 1198 pass / 6 skipped · eslint 0 · build exit 0.**
- Pre-existing, unrelated `tsc --noEmit` test-type errors remain (`authLinkRoute`/`persistence`/`useAuth` test files) — not touched; they don't affect the test/eslint/build gates.

## Slice 5 — `identity_audit` migration  ⚠️ prod push
**Decided (grill 2026-07-03):** append-only unlink log, columns exactly `(auth_user_id, device_uuid, at)` — no `reason`, no PII beyond the pair. Written at the single unified **Disconnect** path **only when the device was AuthLinked** — i.e. inside `useAuth.signOut()` (which already calls `disconnectIdentity()`; slice 3 done, so the hook point exists). Purpose: give Admin Restore a last-known email→device mapping after Google disconnect. **Ready to implement.** Via `supabase/migrations/` + `npx supabase db push` only — **show SQL + get explicit user OK before pushing to prod.** Note: the write is a client-triggered insert from the sign-out path, so it needs an anon-insert RLS policy (append-only, no select) — mind the trust model (CONTEXT.md rate-limit accepted-risk).

## Slice 6 — Achievements epic — only after 3–5. Durable identity is its prerequisite.

## Constraints carried over
- DB changes via migration files + `npx supabase db push` only.
- No new npm deps without approval.
- Never hardcode `"google"` where a provider name flows (Facebook is a later toggle).
- `npm run test -- --run`, `npx eslint .`, `npm run build` after every change; PowerShell only.
- Nemesis/engagement epic context: `.claude/handoffs/nemesisFeature.md`.
