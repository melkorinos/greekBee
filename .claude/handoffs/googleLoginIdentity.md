# Handoff: Sign-in Restore — Slices 1–2 DONE, implement 3–5 via /tdd

**Date:** 2026-07-02
**Status:** Slices 1–2 implemented test-first, all green, **uncommitted on `dev`**. Slices 3–5 remain.
**Next session:** continue in vertical slices, strictly via `/tdd` (user mandate). Read ADR 0012 first.

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

## Slice 3 — Disconnect unification  ⚠️ decision needed first
Goal (ADR 0012 §5): profile-disconnect **and** Google sign-out are one concept — issue a fresh DeviceId **and clear local state** so an adopted identity can't leak to the next person on a shared computer. Signing back in restores everything server-side.

**Tension to resolve before coding:** `useGameStore.test.ts` currently asserts `disconnectProfile` *"does not disturb game slices"* (~line 315). The ADR now wants local state cleared. So decide **how aggressively to wipe**: (a) reset the whole envelope to a fresh `deviceId` only (wipes displayName + all per-game progress) vs (b) clear identity fields only (deviceId/displayName/profileLinked/authLinked) but keep game slices. ADR wording ("clears local state") leans (a); confirm with user. Then:
- Add one shared store fn (e.g. `disconnectIdentity()`), update the existing `disconnectProfile` test to the new contract.
- `useProfile.disconnect()` and `useAuth.signOut()` (`src/hooks/useAuth.ts:77` — today only clears authLinked, does NOT reset deviceId) both call it. Tests: `useProfile.test.ts`, `useAuth.test.ts`.

## Slice 4 — Visibility rule (broader UI touch)
Make `onSignIn` **required** in `LeaderboardProfileSlot` / `useLeaderboardProfile`, and wire auth through **all** in-game LeaderboardModals (today only `src/components/shared/HomeTrophyButton.tsx` wires it). ProfileSection must offer Google sign-in whenever not AuthLinked, in every state incl. `linked`. Files: `src/hooks/useLeaderboardProfile.ts`, `src/components/shared/LeaderboardProfileSlot.tsx`, `ProfileSection.tsx`, + each game's LeaderboardModal call site (not yet surveyed — start with a `/zoom-out` on LeaderboardModal usages). Never hardcode `"google"` where a provider name flows.

## Slice 5 — `identity_audit` migration  ⚠️ prod push
Append-only unlink log `(auth_user_id, device_uuid, at)`, written on Google disconnect (slice 3's path). Via `supabase/migrations/` + `npx supabase db push` only — **show SQL + get explicit user OK before pushing to prod.**

## Slice 6 — Achievements epic — only after 3–5. Durable identity is its prerequisite.

## Constraints carried over
- DB changes via migration files + `npx supabase db push` only.
- No new npm deps without approval.
- Never hardcode `"google"` where a provider name flows (Facebook is a later toggle).
- `npm run test -- --run`, `npx eslint .`, `npm run build` after every change; PowerShell only.
- Nemesis/engagement epic context: `.claude/handoffs/nemesisFeature.md`.
