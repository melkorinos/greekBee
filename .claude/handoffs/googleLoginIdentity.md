# Handoff: Google Login — Verify on Prod, Then Make Identity Durable

**Date:** 2026-07-02
**Status:** Investigation done in-session; nothing implemented yet
**Next session focus:** (1) explain/fix why Google sign-in is invisible on prod, (2) test the OAuth flow end-to-end, (3) align on the durable-identity direction before building on it

---

## Why this exists

Session pivot from the engagement epic (see `.claude/handoffs/nemesisFeature.md` for the original nemesis exploration). Decisions made this session:

- The engagement epic's pillars: nemesis/taunts, weekly leaderboard, records/hall-of-fame, lifetime stats (pangram counts), streaks, **achievements**.
- **Achievements are the user's favourite pillar** — but achievements are worthless if losable, so durable identity is the declared prerequisite for the whole epic.
- Identity spine decision (Q1 of the grill, effectively answered): auth account becomes the durable anchor; device becomes a session. This **inverts ADR 0007** ("OAuth augments device identity") and will need a successor ADR when settled.
- Facebook login: deferred. Demographically sensible for Greek audience, but it's a Supabase provider toggle + one button once Google restore works. Just never hardcode `"google"` where a provider name could be a string.

---

## Finding: why the user doesn't see Google login on prod

Google OAuth **is implemented and shipped** (ADR 0007). The button is just conditionally invisible. Two independent gaps:

1. **ProfileSection hides Google sign-in from ProfileLinked players.**
   `src/components/shared/ProfileSection.tsx` renders "Σύνδεση με Google" only in the `idle` (unlinked) state (~line 159). The `linked` state (ProfileLinked, no Google, ~line 247) shows only name + Μεταφορά + Αποσύνδεση — **no Google button**. Any player who ever saved a display name never sees the sign-in option again unless they disconnect their profile first.

2. **Only the home page wires auth.**
   `HomeTrophyButton.tsx:27` is the *only* `useAuth()` call site. It passes `onSignIn` into the leaderboard modal for the landing-page 🏆 buttons. The in-game LeaderboardModals go through `useLeaderboardProfile` / `LeaderboardProfileSlot`, where `onSignIn` is optional and **no game passes it** — so inside any game, ProfileSection never shows the Google button even in `idle` state.

Most likely the user has a display name (gap 1) and/or opened a leaderboard from inside a game (gap 2). Either alone is sufficient.

> Note: ADR 0007's Consequences section claims the per-game LeaderboardModal "contains ProfileSection and the Google sign-in button" — the code contradicts this (gap 2). Flag when writing the successor ADR.

---

## File map (auth flow, verified 2026-07-02)

| Piece | File |
|---|---|
| OAuth initiation (PKCE, saves return path) | `src/lib/supabase.ts` — `signInWithGoogle()` (~line 251) |
| OAuth callback page | `src/app/auth/callback/page.tsx` |
| Device↔auth linking (backfills `game_scores.auth_user_id`, pre-populates name) | `src/app/api/auth/link/route.ts` |
| Auth state hook | `src/hooks/useAuth.ts` |
| `authLinked` in envelope | `src/hooks/useGameStore.ts` (~line 152), `src/types/index.ts` |
| Sign-in UI (state machine: idle/claiming/linked/authLinked) | `src/components/shared/ProfileSection.tsx` |
| Only auth-wired entry point | `src/components/shared/HomeTrophyButton.tsx` |
| Prop plumbing (onSignIn optional, unused by games) | `src/hooks/useLeaderboardProfile.ts`, `src/components/shared/LeaderboardProfileSlot.tsx` |
| Existing tests | `src/test/shared/useAuth.test.ts`, `src/test/shared/authLinkRoute.test.ts` |

---

## Prod testing checklist (before any code changes)

1. Supabase dashboard → Auth → Providers: is Google enabled on the **prod** project? (Client ID/secret set, not just locally.)
2. Google Cloud Console: authorized redirect URI must include the prod Supabase callback (`https://<project>.supabase.co/auth/v1/callback`).
3. Supabase Auth URL configuration: Site URL + additional redirect URLs must include the prod domain, or the post-OAuth redirect to `/auth/callback` will land on localhost.
4. Then test on prod from the **landing page** 🏆 (the only wired entry point), with a device that has **no** saved display name (or after Αποσύνδεση) — otherwise the button is hidden per the gaps above.
5. Verify after sign-in: `player_profiles.auth_user_id` set, `game_scores` rows backfilled, ProfileSection shows "✓ name · Αποσύνδεση Google".

---

## Open design questions (grill these before implementing)

1. **The merge problem (hardest, decide first):** profile A on phone (anonymous, history), user signs in with Google on laptop → profile B created and linked. Later signs in on phone too → `auth_user_id` wants two `player_profiles` rows. Merge stats? Pick a winner? Block? Decide before achievements data exists.
2. **Restore direction:** sign-in on a fresh device should *adopt* the existing profile (name, stats, future achievements), not just link the new device. Today ADR 0007 only links forward. This is the actual feature.
3. **History backfill:** do pre-profile `game_scores` device rows get adopted at link time? (Partially exists: `/api/auth/link` backfills by device.)
4. **Button visibility fix:** show Google sign-in in the `linked` state too, and wire `onSignIn` through the in-game leaderboard modals? (Probably yes to both — it's the funnel for the epic.)
5. **TransferCode's future:** stays as no-account fallback (ADR 0007 reasoning still holds) or gets deprecated once restore-on-sign-in works?
6. **Successor ADR** to 0007 once 1–3 are settled (hard to reverse, surprising later, real trade-off — meets all three criteria).

---

## Suggested skills

- `/aihelper` — mandatory context reload at session start (soul, memory, goals, reflections, log)
- `/diagnose` — for the prod visibility issue, if the checklist above doesn't explain it
- `/grill-with-docs` — resume the identity grilling (merge semantics first); update CONTEXT.md glossary terms (AuthLinked will change meaning) and draft the ADR 0007 successor inline
- `/to-issues` — once the design settles, slice into: visibility fix, restore flow, merge handling
- `/tdd` — implementation, once issues exist

## Constraints carried over

- DB changes via `supabase/migrations/` + `npx supabase db push` only (never dashboard/MCP alone).
- No new npm dependencies without approval.
- Standing rules in `CLAUDE.md` (tests + eslint + build after every change; post-feature protocol in `soul.md`).
