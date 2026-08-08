# Offline Mode — PARKED handoff

**Status:** parked 2026-08-04. Code is on `dev`, wired but unreachable from the UI.
**Owner decision:** park rather than revert — the implementation is proven isolated and the
single-page path genuinely works. It under-delivers on the promise, which is why it is hidden.

## What the feature was supposed to do

A player activates the toggle while online, boards a plane (or loses signal on a boat), and keeps
playing **several** finished games offline, switching freely between them.

## What actually works

**Single-page protection only.** Activate inside one game, keep playing *that* game: refreshes are
blocked via `beforeunload`, the Leksokipos day-change redirect is suppressed, and the Leksokipos
score is held in a localStorage outbox and flushed on deactivate (or on the next mount as a safety net).

## Why it was parked — the blocker

All 9 game routes are `export const dynamic = "force-dynamic"`. A dynamic route's payload is **not
served from cache on navigation**, so `router.prefetch` cannot make it survive a network cut.
Navigating to another game offline lands on the browser's connection-error page and the round is lost.
Verified against both `next dev` and a production build, and reproduced by the operator in Firefox
on a real preview deployment.

This is not fixable at the prefetch layer. Re-prefetch timers and retry wrappers all depend on the
same cache whose expiry we do not control.

**Important nuance found during investigation:** the routes are `force-dynamic` because they read
`searchParams` (`?puzzle=`) and resolve "today" at request time — not because they need a server.
Leksodromia, for example, is pure functions over static answer pools and never touches the DB. That
makes going static more tractable than ADR 0010 assumed.

## What was done to park it (this commit)

- Removed the drawer toggle, the `Σύνδεση` section, and the help modal from `Shell.tsx`.
- Reduced `guardNavigation` to a plain drawer-close. **It must come back with the toggle** — a
  toggle without the confirmation sends an offline player to an error page and loses their round.
- Removed the now-unused `Modal`, `useOfflineMode`, and `chipWarning` imports from `Shell.tsx`.
- Replaced the two Shell offline test blocks with an `Offline Mode — parked` suite asserting the
  toggle is absent, no confirm fires, and nothing prefetches.
- Left `e2e/offlineMode.spec.ts` skipped and intact. Its `activateOfflineMode` helper can no longer
  find the toggle, so it would fail on a missing selector rather than on the real limitation — that
  is expected while parked.

**Left deliberately in place and inert:** `useOfflineMode.tsx`, `lib/offlineOutbox.ts`,
`postScoreAwaitable`, the `OfflineModeProvider` in `app/layout.tsx`, and the offline branches in
`useScoreSubmission` and `useDayChange`. `active` defaults to `false` and there is now no way to set
it true, so every branch is dormant.

**The flush-on-mount is kept on purpose.** If any preview user activated Offline Mode and left a
pending score in localStorage, hiding the toggle would strand it; the flush rescues it on their next
visit. It is a no-op when the outbox is empty.

## Reviving it — the two candidate paths

Sized on 2026-08-04. The dependency is the small part; the `force-dynamic` work is the real cost.

**Option 1 — hand-written service worker (recommended), 1–2 sessions.** No dependency required;
Serwist/Workbox only generate the file you can write yourself (~60–80 lines in `public/sw.js`:
precache shell + game routes, cache-first when offline). The bulk of the work is making the 9 routes
cacheable — likely resolving the date/`?puzzle=` param client-side instead of `force-dynamic`, which
touches every game page and risks daily rotation plus past-puzzle-via-leaderboard behaviour.

**Option 2 — client-side offline set, 2–3 sessions.** On activation, fetch all six games' puzzle
data into localStorage and render them client-side with no route navigation. Avoids both the service
worker and the `force-dynamic` change, but creates a second rendering path parallel to the real one
and still dies on refresh. More total code and more long-term maintenance.

**Rejected:** Electron (desktop, wrong target — users are on phones), and a "download" button
(browsers expose no such API; it would just be a service worker with a different label).

**Recommended first step either way:** a ~20 minute spike confirming one route can drop
`force-dynamic` without breaking daily rotation. That is the load-bearing unknown, and the answer
may change which option wins.

## Still owed regardless of path

Manual on-device verification of the single-page path has **never been run by a human**. Worth doing
whenever it un-parks, because it is a genuine deliverable on its own:

1. Open a game online → drawer → toggle on.
2. DevTools **Offline** (or airplane mode).
3. Play, then refresh — the browser confirmation must appear.
4. Back online → toggle off → confirm the score reached the leaderboard.
5. Forgot-to-deactivate: score offline, close the tab, reopen online — the score should flush on mount.
6. Flush failure: deactivate while still offline; `localStorage["wordgames:offline-outbox"]` must
   still hold the entry and flush on the next online load.

⚠️ Step 4 writes a **real row to the production leaderboard** — one Supabase project backs dev and prod.

**Expect a genuine second bug here:** `beforeunload` is unreliable on mobile browsers and iOS Safari
commonly suppresses the dialog entirely. If step 3 shows no confirmation on a phone, that is a real
finding and deserves its own issue — not a regression in this code.

## Also deferred (was issue 15, item 2)

Only Leksokipos queues its score. Leksiarxeio, Vres Tin Frasi, Leksodromia, Leksoplegma and
Topothesies lose scores earned offline. The outbox is already keyed by `(gameId, puzzleDate)`, so no
stored-data migration is needed — only which games write to it. Note the two round spines post
differently (ADR 0019): the slot-fill family posts continuously mid-round via `useLiveScorePost`,
the guess family scores once on end. Leksodromia needs an explicit decision because its score decays
against a wall clock.

Mostly moot until cross-game navigation works — a player cannot reach a second game offline anyway.

## References

- `docs/adr/0010-offline-lock-client-side-no-service-worker.md` — the ⛔ block at the top is the
  correction; the decision below it rests on a premise now known to be false.
- `e2e/offlineMode.spec.ts` — skipped acceptance tests. **Do not delete or loosen them.**
- `src/hooks/useOfflineMode.tsx`, `src/lib/offlineOutbox.ts` — the dormant implementation.
