# Offline Mode: cross-game play does not work, and only Leksokipos queues its score

Status: ready-for-agent

Offline Mode shipped 2026-08-03 (ADR 0010, commit `adca4c3`). Two limitations remain — the first is
a **broken headline promise**, the second a deliberate deferral.

## 1. Cross-game navigation while offline DOES NOT WORK (the real finding)

The feature was designed and sold as "play all the finished games without a connection, switching
freely between them." **That does not work, and cannot with the current mechanism.**

Every game page is `export const dynamic = "force-dynamic"`, so its payload is **not served from
cache on navigation**. Neither `router.prefetch` nor an awaited `fetch` warm-up makes the route
survive a network cut — navigating to another game offline lands on the browser's connection-error
page and the round is lost.

**Verified 2026-08-03** against both `next dev` and a production build:
`e2e/offlineMode.spec.ts` — currently `describe.skip`, failing on purpose. **Those tests are the
acceptance criteria for the fix. Do not delete them or loosen their assertions to make them pass.**

What actually ships today is *single-page* offline protection: activate inside one game, keep
playing that game, refreshes blocked, score preserved. The drawer copy and the help modal say this
plainly, and the nav guard now confirms on **every** in-app link rather than exempting the
"prefetched" games.

**To fix it properly:** a service worker. ADR 0010 rejected one twice, both times on the assumption
that route prefetching would be sufficient for warm start — an assumption this issue disproves.
Reopen the ADR rather than patching around it; re-prefetch timers and retry wrappers all still
depend on a cache whose expiry we do not control.

## 2. Only Leksokipos queues its score (deliberate deferral)

Scores earned offline in Leksiarxeio, Vres Tin Frasi, Leksodromia, Leksoplegma or Topothesies are
silently lost. The offline set is **six** games (registry `wip:false` minus `stavrolekso` and
`leksikastirio`, which fetch content from Supabase per view).

Cheap to pick up: the outbox is **already keyed by `(gameId, puzzleDate)`**, so no stored-data
migration is needed — only which games write to it changes.

- [ ] **Wire the remaining games' score paths through the outbox.** They do not post alike: the
      slot-fill family (`useSlotFillRound`) posts **continuously mid-round** via `useLiveScorePost`,
      the guess family (`useGuessRound`) scores **once on end**. See ADR 0019.
- [ ] **Decide Leksodromia explicitly.** Its score decays against a wall clock, so a score earned
      offline and synced an hour later is not obviously the same score. Confirm the intended
      semantics rather than assuming the Leksokipos rule transfers.
- [ ] **Extend the flush tests** to two games played in one offline session — the keyed shape
      supports it, nothing exercises it.

Note this is mostly moot until item 1 is solved: with no cross-game navigation, a player cannot
reach a second game offline in the first place.

## Manual verification still owed

Never run against a real device. Automated gates cannot replace it.

1. Open a game online → drawer → toggle **Εκτός σύνδεσης** on.
2. DevTools → Network **Offline** (or airplane mode).
3. Play. Refresh (F5) → browser confirmation must appear.
4. Click any in-app link → confirmation must appear.
5. Back online → toggle off → confirm the score reached the leaderboard.
6. **Forgot-to-deactivate:** score offline, close the tab, reopen online — the pending score should
   flush on mount.
7. **Flush failure:** deactivate while still offline; `localStorage["wordgames:offline-outbox"]`
   must still hold the entry, and it should flush on the next online load.

⚠️ Step 5 writes a **real row to the production leaderboard** — one Supabase project backs dev and prod.

## References

- `docs/adr/0010-offline-lock-client-side-no-service-worker.md` — decision + the 2026-08-03 amendment.
- `e2e/offlineMode.spec.ts` — the skipped acceptance tests for item 1.
- `src/lib/offlineOutbox.ts`, `src/hooks/useOfflineMode.tsx` — the implementation.
- ADR 0019 — the two round spines, why "wire the rest" is not one uniform change.
