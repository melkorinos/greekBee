# Handoff: Profile Page + Trophy Case — GRILLED, ready for `/to-issues`

**Date:** 2026-07-03 (grilled with docs; supersedes the 2026-07-02 design brief)
**Status:** **Ready for agent** — all §5 design questions resolved (AskUserQuestion, do not re-ask). One soft gate: the user may still rename catalog entries in §4 before implementation freezes the IDs.
**Goal:** Build the **Profile Page** (`/profile`): the manual verification surface for Google sign-in / Sign-in Restore (identity handoff slices 1–2 are done but invisible), and the durable home for the Trophy Case + Lifetime Stats.

**Prerequisites / siblings:**
- **Identity epic (Google sign-in / Restore / Disconnect / `identity_audit`) — COMPLETE and its handoff deleted.** All slices landed 2026-07-03 (sessions 57–60); `identity_audit` migration pushed to prod. Durable records: ADR 0012 (corrected), CONTEXT.md glossary, `.claude/aiHelper/log.md` sessions 57–60, `docs/admin-restore.md`, issue `01-signin-overwrites-foreign-linked-identity.md`. What this page inherits is in §6 below. ⚠️ Session 60's changes are **uncommitted on `dev`** — commit them before starting this epic.
- `.claude/handoffs/manualTestingDevToMain.md` — the cumulative pre-merge manual test checklist. **This epic must append its own section there when it lands** (the §7 plan below is the draft for it); the user tests everything once at the end.
- `.claude/handoffs/achievementsLeksokipos.md` — the detection engine. This page ships the display surface + frozen catalog; the engine wires earned facts later.
- Parent epic: `.claude/handoffs/engagementEpic.md`.
- Glossary terms now in CONTEXT.md: **Profile Page**, **Trophy Case**, **Badge**, **Lifetime Stats**, amended **DeviceId** (secret credential), **Achievement**, **Sign-in Restore**.

---

## 1. Decisions (all resolved 2026-07-03 — do not re-litigate)

| # | Question | Decision |
|---|---|---|
| 1 | Profile controls: reuse vs rebuild | **Hybrid** — new page-native identity **header** (display-only: avatar disc, name, status line) + reuse `ProfileSection` verbatim below it for all interactive flows. New code can't break tested flows. |
| 2 | Page vs leaderboard-modal profile | **Coexist untouched.** Modal keeps its compact widget (mid-game sign-in without leaving the puzzle); add a "Δες το προφίλ σου →" link from modal to page. Slice 4 of the identity handoff proceeds independently. |
| 3 | Stats identity key | **`device_uuid`.** Settled by existing docs: the Achievement glossary entry keys on DeviceId, and Sign-in Restore's merge repoints all score rows to the canonical `device_uuid`. `auth_user_id` is an anchor-lookup index, not a stats key. |
| 4 | Trophy case v1 content | **Real catalog, all locked.** Genuine Greek names, hints, tiers (§4); everything renders greyed. IDs freeze on first deploy (Puzzle-ID rule). |
| 5 | OAuth round-trip from `/profile` | **Verified in code, no work**: `signInWithGoogle` saves `window.location.pathname` (`src/lib/supabase.ts:268`), callback redirects back (`src/app/auth/callback/page.tsx:74-76`). |
| 6 | Public profiles (view other players) | **Deferred** to its own future slice. Hard rule recorded in CONTEXT.md: DeviceId is a secret credential — public profile URLs need a new safe public identifier + public API + privacy decisions. Nothing in v1 may leak `device_uuid` into shareable URLs. |
| 7 | Lifetime stats v1 | **Cheap real stats now**: total points, puzzles played, Τζιμάνι count — SUM/COUNT over existing `game_scores` rows. **No streaks** (fiddly; pairs with future streak achievements — design once, there). |
| 8 | Settings section | **None in v1.** Name edit comes free via `ProfileSection`; theme lives in Shell. A Ρυθμίσεις section appears when a real setting exists. |
| 9 | Welcome banner / restore landing | **Callback redirects to `/profile` when `restored === true`** (instead of the origin page). The player lands on the proof: adopted name, merged stats, trophy case, banner. Page consumes `sessionStorage["signin-restore-welcome"]` on mount. |
| 10 | Avatar v1 | **Initial-letter disc** (first letter of display name, "Α" for Ανώνυμος) — pure Tailwind, identical across identity states. Google photo is a later upgrade. |
| 11 | Catalog authoring | **Drafted now** (§4) for user review; implementation transcribes it. |
| 12 | Profile entry on game screens | **Always-visible icon in the Shell header next to the hamburger** (👤/avatar disc button → `/profile`), NOT a drawer entry — one tap, discoverable for the anonymous players we want to nudge toward Google. ("Both" was offered and declined.) |

---

## 2. Page layout (`src/app/profile/page.tsx`, client, wrapped in `Shell`)

1. **Identity header** (new, display-only): initial-letter avatar disc + display name + status line:
   - AuthLinked → "Συνδεδεμένος με Google ως {authUserName}"
   - ProfileLinked only → "Προφίλ ενεργό: {displayName}" + hint that Google makes it un-losable
   - Anonymous → "Παίζεις ανώνυμα" + sign-in nudge (the actual button is in ProfileSection below)
2. **Welcome-back banner**: on mount, if `sessionStorage["signin-restore-welcome"]` set → "Καλώς όρισες πίσω{, name}! Τα σκορ σου επαναφέρθηκαν." once, then clear the flag.
3. **Account controls**: `ProfileSection` verbatim (all props wired via `useProfile` + `useAuth` + name-save, same as `HomeTrophyButton` does today).
4. **Lifetime stats strip**: three real numbers (§3). Loading skeleton while fetching; hide or dash on fetch error — never block the page.
5. **Trophy case**: grid over the §4 catalog, all locked/greyed, each tile showing Badge glyph, Greek name, unlock hint; tiered entries show the tier row (Χάλκινο/Ασημένιο/Χρυσό thresholds).

### Entry points (all three)
- **Shell header icon** (primary): always-visible 👤/avatar-disc button next to the hamburger, `aria-label="Το προφίλ μου"`, links to `/profile` — `src/components/shared/Shell.tsx` header row (same 36px round-button style as the theme toggle). No drawer entry (decision 12).
- **Home picker**: small profile chip on `src/app/page.tsx` header (name when linked, "Σύνδεση" otherwise). Note: home page is currently a server component — chip must be a small client island.
- **ProfileSection**: "Δες το προφίλ σου →" link so the modal funnels to the page.

### Restore redirect
`src/app/auth/callback/page.tsx`: when the link response has `restored: true` → `router.replace("/profile")` instead of the saved `auth-redirect` path (still clear the key).

---

## 3. Lifetime-stats endpoint

- `GET /api/profile/stats?device_uuid=` (edge runtime, fetch-only, read-only): returns `{ total_points, puzzles_played, tzimani_count }` from `game_scores` where `device_id = device_uuid` — `SUM(score)`, `COUNT(*)`, `COUNT(*) FILTER (is_perfect)`.
- **No custom-puzzle filter needed** — verified: custom puzzles never post (`useScoreSubmission` `enabled:false`, `src/hooks/useScoreSubmission.ts`), so `game_scores` is daily-only already.
- Cross-game by design (all games' rows count; "Score" is overloaded per CONTEXT.md — label the strip "Πόντοι" generically).
- Caching note (soul.md Fluid-CPU): per-visit read, small per-device row set, no cache needed at current scale; add `Cache-Control: private, max-age=60` as a courtesy. Document in the route header.
- Reading by `device_uuid` is fine (it's the bearer of its own identity); the response contains only aggregates.

---

## 4. Trophy-case catalog v1 — Leksokipos only (DRAFT for user review; IDs freeze on ship)

File: `src/games/leksokipos/lib/achievements.ts` — pure, zero React imports. Shape per entry: `{ id, name, hint, kind: "oneshot" | "tiered", tiers?: [{ id, tier, threshold, label }] }` plus a future predicate signature (detection is the achievements epic's job). **Each tier carries its own frozen `id`** — it is the `player_achievements.achievement_id` for an immutable one-row-per-tier award (ADR 0012). Adding *new* tiers later is non-breaking; renaming/removing IDs is forbidden after ship.

**No backfill / retroactivity.** The DB gets a **hard reset at launch**, so every counter and unlock starts at zero for everyone — no history-derived seeding, no "since you were away" grant storm. This removes the entire backfill-complexity axis.

| id | Badge name | Unlock hint (shown greyed) | Kind | Detection (from launch onward) |
|---|---|---|---|---|
| `leksokipos-first-daily` | Πρώτα Βήματα | Παίξε το πρώτο σου ημερήσιο παζλ. | one-shot | server: first `game_scores` row |
| `leksokipos-stin-korifi` | Στην Κορυφή | Φτάσε στην κατάταξη Απολυτότητα σε ένα ημερήσιο παζλ. | one-shot | client-detect (rank vs maxScore) — named distinctly from the Rank itself |
| `leksokipos-tzimani` | Τζιμάνι | Βρες όλες τις λέξεις ενός ημερήσιου παζλ. | one-shot | server: `game_scores.is_perfect` |
| `leksokipos-sidirodromos` | Σιδηρόδρομος | Βρες μια λέξη με 10+ γράμματα. | one-shot | client via `pushFoundWords` (word length) |
| `leksokipos-theristis` | Θεριστής | Βρες το 80% των λέξεων ενός ημερήσιου παζλ. | one-shot | client-detect (foundWords/validWords — count axis, distinct from Endgame Zone's points axis) |
| `leksokipos-kynigos-pangram-{chalkino/asimenio/chryso}` | Κυνηγός Πανγκράμ (Χάλκινο/Ασημένιο/Χρυσό) | Βρες {10 / 20 / 50} πανγκράμ. | tiered 10 / 20 / 50 | client counter `player_stats.pangrams_found` via `pushFoundWords` |
| `leksokipos-syllektis-ponton-{chalkino/asimenio/chryso}` | Συλλέκτης Πόντων (Χάλκινο/Ασημένιο/Χρυσό) | Μάζεψε {1.000 / 10.000 / 25.000} πόντους συνολικά. | tiered 1 000 / 10 000 / 25 000 | server: `SUM(score)` derived on read (no counter) |

Naming notes: «Σιδηρόδρομος» is the archetypal Greek "long word" joke; «Θεριστής» keeps the garden theme (λεξόκηπος); «Στην Κορυφή» avoids colliding with the Rank name Απολυτότητα in the glossary. Per-tier frozen ids use the `-chalkino/-asimenio/-chryso` suffix; the badge label shows the Greek tier word.

---

## 5. Slices for `/to-issues`

1. **`/profile` route + identity header + welcome banner + restore redirect** — ships against existing hooks, no new API. *This alone validates Google/restore end-to-end.*
2. **Entry points** — Shell header profile icon (next to hamburger), home-picker chip (client island), ProfileSection funnel link.
3. **Lifetime-stats endpoint + strip** (§3).
4. **Catalog + trophy case grid** (§4, all locked).
5. → hand off to `achievementsLeksokipos.md` for detection, `player_achievements` table, earned wiring, backfill.

Each slice: `/tdd`, then `npm run test -- --run`, `npx eslint .`, `npm run build` — all green before the next.

---

## 6. What the identity session landed (all DONE — facts, not risks)

- **Disconnect = full local reset + hard reload.** `disconnectIdentity()` wipes the whole envelope (deviceId, name, flags, every game slice); both `useProfile.disconnect()` and `useAuth.signOut()` then call `reloadApp()` (`src/lib/reload.ts`) so no in-memory state survives. The page's disconnect/sign-out buttons get all of this for free by reusing `ProfileSection` + `useAuth` — expect the page to reload on Disconnect, don't fight it (e.g. don't rely on post-disconnect React state).
- **`onSignIn` is a required prop** on `ProfileSection`/`useLeaderboardProfile` (slice 4) — the page must wire it from `useAuth.signInWithGoogle`; the compiler enforces it.
- **`identity_audit` (slice 5)** is link-time and server-side, inside `/api/auth/link` — invisible to this page; nothing to wire.
- **Restore contract for decision 9:** the callback already sets `signin-restore-welcome` (sessionStorage) and adopts via `adoptDeviceIdentity`; this epic adds the `restored:true → router.replace("/profile")` redirect in `src/app/auth/callback/page.tsx`.

---

## 7. Manual verification plan — DRAFT; append the final version to `manualTestingDevToMain.md` when the epic lands (user tests everything once, pre-merge)

1. Anonymous play on browser A → daily score → `/profile` shows "Παίζεις ανώνυμα" + real stats (points, 1 puzzle).
2. Sign in with Google on A → returns to `/profile` (round-trip verified in code) → header shows "Συνδεδεμένος ως {name}"; DB: `player_profiles.auth_user_id` set, scores stamped, `identity_audit` +1 row (first link only).
3. Browser B (fresh), play a *different* daily, sign in with the **same** account → **Sign-in Restore**: redirected to `/profile`, welcome banner fires, adopted name shown, stats strip shows the **merged** totals (best-score-per-puzzle arithmetic visible on the page).
4. Disconnect on B → the app **hard-reloads** and comes back as a fresh anonymous identity (full envelope wipe — landed slice-3 semantics); sign back in → everything returns.

Any misbehaviour → `/diagnose`.

---

## 8. Constraints carried over
- Pure logic (catalog, stat shapes) in `src/games/leksokipos/lib/` — zero React imports.
- Nothing graduates to `src/components/shared/` speculatively; the trophy-case grid starts page-local.
- Tailwind tokens only; Greek-only player-facing strings; never hardcode `"google"` where a provider name flows.
- No DB migration needed for v1 (stats are query-only; `player_achievements` belongs to the achievements epic).
- Edge runtime for the stats route; no per-word hotpath cost.
- **Never expose `device_uuid` in URLs or shareable payloads** (CONTEXT.md DeviceId rule).

## Suggested skills
- `/to-issues` — slice per §5.
- `/tdd` — implementation.
- `/verify` or `/run` — the §7 manual pass.
