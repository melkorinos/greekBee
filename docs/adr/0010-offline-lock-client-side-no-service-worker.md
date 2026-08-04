# ADR 0010 — Offline Mode: client-side, warm-start only, no service worker

> # ⛔ BUILT 2026-08-03 — and the core premise turned out to be WRONG.
>
> **Cross-game navigation while offline does not work.** Route prefetching does not make a
> `force-dynamic` page survive a network cut: its payload is not served from cache on navigation, so
> switching games offline lands on the browser's connection-error page. Verified against both
> `next dev` and a production build — `e2e/offlineMode.spec.ts`, skipped and failing on purpose as
> the acceptance test for any fix.
>
> **This invalidates the reasoning below, not the code.** Both rejections of a service worker
> (original, and the 2026-08-03 amendment) rest on "warm start needs only route prefetching."
> That premise is false. A service worker is now the *only* known way to deliver the multi-game
> offline play this ADR promises — **reopen this decision rather than patching around it**;
> re-prefetch timers and retry wrappers depend on the same uncontrolled cache expiry.
>
> **What actually ships** is single-page offline protection: activate inside one game, keep playing
> *that* game with refreshes blocked and the score preserved. That works and is genuinely useful.
> The UI says so; the nav guard confirms on **every** in-app link, exempting nothing. Tracked in
> `.claude/issue-tracker/issues/15-offline-cross-game-score-queueing.md`.
>
> Everything below is preserved as the record of what was decided and why it was wrong.

> **BUILT 2026-08-03.** Implemented as described below. Two ambiguities in the handoff were
> resolved during implementation and are now part of this decision:
>
> 1. **The offline set excludes `stavrolekso` and `leksikastirio`** even though both are `wip:false`.
>    The handoff said "derive from `GAME_REGISTRY[id].wip`" and separately named eight games; the two
>    lists disagree (it also named `leksindeseis`, which is `wip:true`). Both excluded surfaces fetch
>    their content from Supabase per view, so a prefetched route yields an empty shell rather than a
>    playable round. The exclusion is one named constant (`OFFLINE_EXCLUDED` in `useOfflineMode.tsx`)
>    subtracted from the registry derivation, so a real game's flag flip still auto-includes it.
> 2. **Navigation is intercepted only for destinations outside the prefetched set.** A literal reading
>    of "in-app nav links show a confirmation" would prompt on game-to-game navigation — the exact
>    action the feature exists to enable. The header logo, `/profile`, and any non-offline route
>    confirm; the offline games do not.
>
> **Not yet verified — and one open item is a GO/NO-GO on this ADR itself.** The manual
> DevTools-offline pass (handoff §13) is outstanding. Item **D**, router-cache lifetime, is not
> ordinary verification: if prefetched routes evict during a long offline session, **route
> prefetching is insufficient as a mechanism** and the "no service worker" decision below has to be
> reopened rather than patched. Re-prefetch timers and retry wrappers do not fix it — they still
> depend on a cache whose expiry we do not control. Run D before merging to `main`; treat a failure
> as a trigger to reopen this ADR, not as a bug.

> **Amended 2026-08-03 — scope widened from Leksokipos to all finished games.** The original
> decision (client-side, no service worker) **stands and is reconfirmed**. What changed: the feature
> covers every `wip:false` game rather than Leksokipos alone, the outbox is keyed per game, and the
> term is now **Offline Mode** (the original "Offline Lock" named a Leksokipos-only toggle). The
> original text is preserved below under *Original decision*; the amendment is authoritative where
> the two differ. *(The implementation brief `offlineFeature-handoff.md` was deleted once built —
> its surviving detail is in this ADR and in issue 15.)*

Deliberate offline play is implemented as a client-side **Offline Mode** rather than a service worker
or installable PWA. When the player activates it — **while still online** — the app prefetches the
finished games' routes, blocks browser refresh and un-prefetched navigation, suppresses the
Leksokipos `useDayChange` redirect, and queues Leksokipos score submissions to a localStorage
**Offline Score Outbox** instead of posting them directly. Deactivation is manual; the outbox is
flushed on deactivate, or automatically on the next page mount as a safety net.

## Considered options

**A — Installable PWA with service worker (Serwist/next-pwa):** enables cold-start offline and true background sync. Rejected: requires a new dependency (blocked by CLAUDE.md standing rule without explicit approval), a manifest + icon asset pass, and SW cache-versioning complexity. The primary audience (mobile, mid-flight) does not need cold-start — they load the page before boarding.

**B — Service worker for caching only, no install prompt:** enables cold-start without installability. Rejected for the same dependency and complexity reasons; the marginal benefit over option C does not justify the overhead.

**C — Client-side lock mode (chosen):** zero new dependencies, ships in one feature increment, covers the real failure mode (accidental refresh/navigation while offline). Works as long as the tab was loaded before going offline — an acknowledged constraint.

## Amendment (2026-08-03) — why cold start was rejected a second time

The rescope was triggered by the goal *"play all games without signal, on the plane, switching
between games."* That phrasing reads as cold start, so the option was re-examined rather than
inherited, and rejected again on **stronger** grounds than the original dependency argument:

Every game page is `export const dynamic = "force-dynamic"` — the HTML is generated per request. A
page not already in memory **cannot load without the server**. Cold start would therefore require a
service worker *plus* rearchitecting the rendering mode of every game route *plus* pre-shipping
puzzle data to the device. That is a multi-session epic, not an increment.

It is also unnecessary for the actual user story, which was pinned during the grill: the player is
**online when they activate**, then loses signal. The tab never closes. Warm start covers this
completely.

**Correcting the original ADR:** the last consequence below stated that *"other games require
offline support"* would justify a service worker. That is **wrong for warm start** — extending to
all finished games needs only route prefetching on activation, no service worker and no new
dependency. A service worker remains justified for **cold start alone**.

**Superseded:** the original *"No online notification — flush is manual (toggle-off) only"* stance
is unchanged in effect (deactivation stays manual), but the reasoning is now explicit: an automatic
flush-and-unlock would surprise a player deliberately staying offline.

## Consequences

- **Cold start (closed tab, rebooted phone) is not supported — by design, reconfirmed twice.** Players must load the page and activate Offline Mode before going offline. Do not "fix" this without reopening this ADR.
- **A refresh while offline is unrecoverable**, because the pages are `force-dynamic`. This is why the feature blocks refresh via `beforeunload` rather than merely warning. The browser's dialog copy is not customisable, so the explanation must live in the activating UI.
- **Cross-game navigation works only for routes prefetched at activation time.** Prefetch is best-effort and the Next router cache has its own lifetime — a long offline session may outlive it. This is the feature's most likely under-delivery and must be verified against a real offline session.
- The Offline Score Outbox is a localStorage record **keyed by `(gameId, puzzleDate)`**, overwriting per key: `{ gameId, puzzleDate, deviceId, score, displayName }`. It is not a queue — `game_scores` upserts by `(device_id, game_id, puzzle_date)`, so only the latest score matters. *(Originally a single global entry; keyed from the start to avoid a stored-data migration and to stop a second game silently discarding the first game's pending score.)*
- **Only Leksokipos scores are queued** in the first pass. The other finished games are playable offline but their scores are lost — a conscious deferral tracked in `.claude/issue-tracker/issues/15-offline-cross-game-score-queueing.md`.
- Flushing requires a **success signal that `postScore` does not provide** — it is fire-and-forget and returns `void`. An async sibling `postScoreAwaitable` is added; `postScore` stays untouched so the eight games posting through it keep its "never crash the game" guarantee.
- `game_state` (found-words cross-device sync) is not queued. It self-heals: the first word found after reconnect triggers a push of the full `foundWords` array via the existing `useGameStateSync` path.
- **Score queueing** is restricted to Leksokipos Daily Puzzles. Custom Puzzles have no leaderboard and no `puzzleDate` to key an outbox entry on — they remain playable offline, they simply queue nothing.
- Offline Mode covers `wip:false` games only, derived from `GAME_REGISTRY`, so a flag flip is enough to include a game later.
- If cold start becomes genuinely necessary, add a service worker as a separate increment — the outbox and the toggle are additive-compatible with SW caching. Extending warm-start offline to *more games* does **not** need one.
