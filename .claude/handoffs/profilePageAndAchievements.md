# Handoff: Profile Page + Achievements Surface (build the display surface first)

**Date:** 2026-07-02
**Status:** Design brief — ready to grill/slice. No code yet.
**Goal:** Build a real **Profile page** that displays identity state **and** a trophy case, *before* the achievements engine exists. Two payoffs: (1) it becomes the manual **verification surface** that proves the Google sign-in / Sign-in Restore work end-to-end (slices 1–2 of `googleLoginIdentity.md` are done but have no visible home yet); (2) it answers the still-open "**where do badges live?**" question in `achievementsLeksokipos.md` so that handoff can go to implementation.

**Prerequisites / siblings:**
- `.claude/handoffs/googleLoginIdentity.md` — identity spine. **Slices 1–2 DONE** (JWT-verified `/api/auth/link`, Sign-in Restore + merge, `adoptDeviceIdentity`). Slices 3–5 (Disconnect unification, visibility rule, `identity_audit`) still open and **intersect this page** (see §6).
- `.claude/handoffs/achievementsLeksokipos.md` — the achievement catalog/detection sketch. This page is the "display surface" (its design question #1). Build the surface here; the engine stays there.
- Parent epic: `.claude/handoffs/nemesisFeature.md`.

---

## 1. What exists today (verified 2026-07-02)

| Piece | Reality |
|---|---|
| **Profile UI** | `src/components/shared/ProfileSection.tsx` — a *modal section*, not a page. Modes: idle (Google sign-in / nickname / claim code), claiming, linked, transferring, confirming, and an authLinked state (Google ✓ + sign-out). Fed by `useProfile` + `useAuth`. |
| **Where it lives** | Only as the `topSlot` of each game's LeaderboardModal (`src/components/shared/LeaderboardModal.tsx`, `LeaderboardModalBase`), opened via 🏆 `HomeTrophyButton` on home cards + in-game. There is **no standalone profile route.** |
| **Badge precedent** | Leaderboard rows already render 🏛️ for `is_perfect` (Τζιμάνι) and "(εσύ)" for the player — `LeaderboardModal.tsx` ~L285/L306. Inline badge marks on rows are an established pattern. |
| **Header / nav** | `src/components/shared/Shell.tsx` wraps game screens: sticky header (platform link, theme toggle, hamburger) + a slide-out drawer listing games + Κοινότητα. **No profile entry point.** The home picker (`src/app/page.tsx`) doesn't use Shell and also has no profile entry. |
| **Identity data on device** | `useGameStore` envelope: `deviceId`, `displayName`, `profileLinked`, `authLinked`. Hooks: `useAuth` (authLinked, authUserName, signInWithGoogle, signOut), `useProfile` (profileLinked, create/transfer/claim/disconnect), `useGameIdentity` (deviceId/displayName init). |
| **Server profile** | `GET/POST /api/profile` (`player_profiles` row by `device_uuid`). No lifetime-stats endpoint. Scores live in `game_scores` (append-forever; unique `(game_id, device_id, puzzle_date)`; `auth_user_id` now stamped after slice 1). |
| **Restore flag (new)** | Callback sets `sessionStorage["signin-restore-welcome"]` on Sign-in Restore and `localStorage["leksokipos-needs-restore"]`. **Nothing consumes the welcome flag yet** — the Profile page is its natural home (deferred toast). |

---

## 2. Proposed surface: `/profile`

A new route `src/app/profile/page.tsx` (client page; wrap in `Shell` for header/nav parity). Sections, top to bottom:

1. **Identity header** — avatar/emoji + display name; a status line that makes identity legible for verification:
   - AuthLinked → "Συνδεδεμένος με Google ως {authUserName}"
   - ProfileLinked (no Google) → "Προφίλ ενεργό: {displayName}" + a hint to sign in with Google to make it un-losable
   - Anonymous → "Παίζεις ανώνυμα" + sign-in CTA
   - This is the **at-a-glance proof** that sign-in / restore worked.
2. **Account controls** — reuse the *logic* behind `ProfileSection` (Google sign-in/out, nickname, transfer code, disconnect). Decide (see §5) whether to reuse `ProfileSection` verbatim or build a roomier page-native variant sharing the same handlers.
3. **Lifetime stats strip** — total points, games played, current/best streak (Leksokipos v1). Needs a small server aggregate (see §4). Ship as a stub ("Σύντομα") if the engine isn't ready — the page must not block on it.
4. **Trophy case** — the achievements grid: earned badges lit, locked ones greyed with their unlock hint. **v1 renders from a static catalog with everything locked/empty** so the page ships before any detection exists. This is the surface `achievementsLeksokipos.md` fills in later.
5. **Welcome-back banner** — on mount, if `sessionStorage["signin-restore-welcome"]` is set, show a one-time "Καλώς όρισες πίσω, {name}! Τα σκορ σου επαναφέρθηκαν." then clear the flag. (This is the "tiny toast later" from the identity handoff, homed here.)

### Entry points
- **Shell drawer**: add a "👤 Το προφίλ μου" link above/below Παιχνίδια (`Shell.tsx`). Primary entry on game screens.
- **Home picker header**: a small profile chip/button on `src/app/page.tsx` (shows name when linked, "Σύνδεση" when not).
- **From ProfileSection**: a "Δες το προφίλ σου →" link, so the existing modal funnels to the full page.

---

## 3. Achievements display-surface decision (answers achievements-handoff Q1)

- **Full trophy case → the Profile page** (this doc). One durable home for all badges + progress bars for tiered achievements.
- **Inline marks → leaderboard rows** keep the 🏛️-style single-glyph badge (already there for Τζιμάνι); optionally a top-badge per player later. No full case in the modal.
- So: **(c) both** from the achievements sketch — tiny inline marks + full case in profile. Prototype only if the trophy-case layout needs it (`/prototype`).

---

## 4. Data the page needs

- **Identity** — already on device (`useAuth`/`useProfile`/`useGameStore`). No new fetch for the identity header/controls.
- **Lifetime stats** — new server aggregate, e.g. `GET /api/profile/stats?device_uuid=` (or fold into `GET /api/profile`): `SUM(score)`, `COUNT(*)`, streak from `game_scores` for daily puzzles only (exclude custom, matching the leaderboard rule). Edge runtime, fetch-only. Watch soul.md's Fluid-CPU rule — this is a per-visit read over a small windowed set; document a caching note. **Key it by identity carefully**: after Sign-in Restore, stats should read by the *adopted* identity (`device_uuid`, or `auth_user_id` when AuthLinked). Confirm which key when the achievements handoff fixes the achievement identity key.
- **Earned achievements** — future `player_achievements` table (out of scope here). v1 trophy case reads the **code catalog only** (`src/games/leksokipos/lib/achievements.ts`, pure) and shows all locked. Wiring earned facts is the achievements epic.

---

## 5. Open design decisions (grill these first)

1. **Reuse vs page-native profile controls** — reuse `ProfileSection` verbatim inside the page (fast, DRY, but it's compact/modal-tuned), or extract the shared handlers into a hook (already effectively `useProfile`+`useAuth`) and build a roomier page layout? Recommend: keep `ProfileSection` for controls in v1, wrap with page chrome; refactor only if it feels cramped.
2. **Does the page replace the leaderboard-modal profile, or coexist?** Recommend coexist: modal keeps quick inline controls; page is the home/trophy case. (Avoids destabilising the tested modal flow.)
3. **Stats identity key** — `device_uuid` vs `auth_user_id` post-restore (ties to the achievements identity-key decision). Pick one source of truth.
4. **Trophy-case catalog shape** — the v1 static catalog (`achievements.ts`) needs an id, Greek name, description/unlock-hint, tier info, and a locked/earned predicate signature — even if everything is locked at first. Freeze ids once shipped (same rule as Puzzle IDs).
5. **Auth on a full page vs modal** — `useAuth`'s OAuth redirect returns to `sessionStorage["auth-redirect"]` = current path, so signing in *from* `/profile` returns to `/profile`. Verify that round-trip.

---

## 6. Intersections with the identity handoff (don't duplicate work)

- **Slice 4 (visibility rule)** makes `onSignIn` **required** and wires auth through every LeaderboardModal. The Profile page needs the same `onSignIn`/`onSignOut` wiring — do it consistently. Building this page may be the cleanest place to land slice 4's intent (one shared identity-controls surface).
- **Slice 3 (Disconnect unification)** — the page's disconnect button must use the unified path (fresh DeviceId + clear local state). Decide slice 3 first, or the page's disconnect will disagree with the modal's.
- **Slice 5 (`identity_audit`)** — unaffected by the page; keep separate.
- **Sign-in Restore verification** (the user's stated reason for building this now): see §7.

---

## 7. Manual verification plan — proves Google login + Restore work

Once the page renders identity state, use it to validate slices 1–2 end-to-end (the handoff listed prod-config checks; this is the functional pass):
1. Anonymous play on browser A → score a daily puzzle → `/profile` shows "ανώνυμα" + a lifetime point.
2. Sign in with Google on A → `/profile` shows "Συνδεδεμένος ως {name}"; `player_profiles.auth_user_id` set; scores stamped (`game_scores.auth_user_id`).
3. Browser B (fresh device), play a *different* daily, then sign in with the **same** Google account → **Sign-in Restore**: `/profile` shows the adopted name, the welcome banner fires, and lifetime stats reflect the **merged** history (best-score-per-puzzle). Confirms `planScoreMerge` + adoption.
4. Disconnect on B → identity resets (pending slice 3 semantics); sign back in → everything returns (nothing deleted server-side).

If any step misbehaves, `/diagnose`.

---

## 8. Constraints carried over
- Pure logic (catalog predicates, tier thresholds, stat derivations) in `src/games/leksokipos/lib/` — zero React imports; testable.
- New shared components graduate to `src/components/shared/` only when ≥2 surfaces need them (the page + modal may justify a shared `<TrophyCase>` / identity-header later — not speculatively).
- Tailwind tokens only (ADR 0008/0009); no inline styles / magic hex. Per-game accent via `[data-game]` if a game context applies.
- DB changes only via `supabase/migrations/` + `npx supabase db push` (show SQL first). Edge runtime for fetch-only routes; document any aggregate's caching per soul.md.
- Greek-only player-facing strings. Never hardcode `"google"` where a provider name flows.
- `npm run test -- --run`, `npx eslint .`, `npm run build` after every change; PowerShell only. `/tdd` for implementation.

## 9. Definition of "ready for agent"
Answered: route + entry points, which profile controls (reuse vs native), stats endpoint shape + identity key, trophy-case catalog shape, and how the welcome flag is consumed. Then `/to-issues` — likely slices: (1) `/profile` route + identity header + welcome banner (ships against existing hooks, no new API — **this alone validates Google/restore**); (2) entry points (Shell drawer + home chip); (3) lifetime-stats endpoint + strip; (4) static trophy-case catalog + grid (all locked); (5) hand off to achievements epic for detection + earned facts.

## Suggested skills
- `/aihelper` — context reload.
- `/grill-with-docs` — work §5 decisions; update CONTEXT.md (glossary: Profile page? Trophy case / Badge) inline.
- `/prototype` — trophy-case layout variations if needed.
- `/tdd` — implementation; `/verify` or `/run` for the §7 manual pass.
