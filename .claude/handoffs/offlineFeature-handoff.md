# Handoff — Offline Mode (BUILT — awaiting manual offline verification)

**Status:** IMPLEMENTED 2026-08-03 via `/tdd`. All automated gates pass (vitest, eslint, build,
Playwright). **The one thing left is §10's manual DevTools-offline pass**, which no automated gate
can replace — see the checklist at the bottom of this file.

**Two handoff ambiguities were resolved during implementation** (both recorded in ADR 0010):
- §3's in-scope list contradicted the registry (it named `leksindeseis`, which is `wip:true`, and
  the registry derivation pulls in `stavrolekso`/`leksikastirio`). Resolution: derive from
  `GAME_REGISTRY.wip` minus a named `OFFLINE_EXCLUDED` set for the two server-backed community
  surfaces → **six** offline games, not eight.
- §5's "in-app nav links show a confirmation" would have prompted on game-to-game navigation, the
  exact action the feature enables. Resolution: confirm only for destinations outside the
  prefetched set.

**Original design brief follows** — it remains accurate except where the two points above apply.

---

**Status (original):** Design complete and rescoped 2026-08-03. No code written yet.
**Supersedes:** the 2026-06-29 Leksokipos-only design. Ticket `07-offline-lock-build-shape.md` is
resolved and deleted; its two open questions are answered below (state sharing → §6, toggle
placement → §7).

---

## 1. Goal

Let a player deliberately go offline — plane, tunnel, dead signal — and keep playing **all eight
finished games**, switching between them freely, without losing the round to a failed page load.

The player is **online when they activate**. That is the load-bearing assumption; §2 explains why.

### Happy path (the user story this is built against)

1. Player opens any game while online.
2. Player taps the Offline Mode toggle. The app prefetches the other finished games.
3. Player loses signal.
4. Player plays, and navigates between games, with no network.
5. Player regains signal and deactivates. Any queued Leksokipos score syncs.

---

## 2. Why warm start, and why there is no service worker

**Cold start is out of scope** — and this was re-confirmed on 2026-08-03 specifically against the
"on the plane" scenario, which is the one that most tempts a future session to reopen it.

Every game page is `export const dynamic = "force-dynamic"`. The HTML is generated per request. A
page that is not already in memory **cannot be loaded without the server**, so supporting a cold
start (closed tab, rebooted phone) would require all of:

- a service worker — a new dependency, blocked by the CLAUDE.md standing rule
- rearchitecting the rendering mode of every game route
- shipping puzzle data to the device ahead of time

That is a multi-session epic, not this feature. ADR 0010 rejected it once on dependency and
complexity grounds; the 2026-08-03 grill rejected it again on scope. **Do not add a service worker
as part of this work.** ADR 0010 notes the two are additive-compatible if cold start is ever
genuinely wanted.

The direct consequence, which drives §5: **while offline, a refresh or an un-prefetched navigation
is unrecoverable.** The round is gone. This is why the feature blocks those actions rather than
merely warning about them.

---

## 3. Scope

**In — the 8 finished games:** `leksokipos`, `leksiarxeio`, `vrestifrasi`, `leksodromia`,
`leksoplegma`, `stavrolekso`, `topothesies`, `leksikastirio`.

**Out — the 3 `wip:true` games:** `leksindeseis`, `posokanei`, `logopaignio`. They get offline
support when they flip to `wip:false`, not before. Derive the list from the registry
(`GAME_REGISTRY[id].wip`) rather than hardcoding it, so a flag flip is enough — this mirrors how
`Shell.tsx` already splits `MAIN_GAME_IDS` / `WIP_GAME_IDS`.

> `leksindeseis` is `wip:true` in `src/config/games.ts` even though `memory.md` and `goals.md` call
> it "Live". The flag is correct and deliberate (thin static fallback pool — see `reflections.md`);
> the docs are stale. Do not flip it as part of this work.

**Leksokipos keeps its Daily-Puzzles-only restriction for scoring** (§4). Custom Puzzles have no
leaderboard and no `puzzleDate` to key an outbox entry on. Custom puzzles may still be *played*
offline — they simply queue nothing.

---

## 4. Score handling — Leksokipos only

**Only Leksokipos scores are queued, tested, and guaranteed in this pass.** The other seven games
are playable offline but their scores are **not** queued — a score earned offline in Leksodromia is
lost. This is a conscious deferral, tracked in
`.claude/issue-tracker/issues/15-offline-cross-game-score-queueing.md`.

### Offline Score Outbox

A localStorage record, **keyed by `(gameId, puzzleDate)`**, overwriting per key:

```ts
{ gameId: string, puzzleDate: string, deviceId: string, score: number, displayName: string }
```

Keying by `(gameId, puzzleDate)` from the start is deliberate even though only Leksokipos writes
today: it is the same amount of code as a single global entry and it avoids a stored-data migration
when the deferred issue is picked up. A single global entry would silently discard the first game's
pending score the moment a player played a second game offline — exactly the scenario this feature
invites.

Each new word overwrites the entry for its key. `game_scores` upserts by
`(device_id, game_id, puzzle_date)`, so only the latest score matters — this is an overwriting
record, **not** an append queue.

### Flush must be able to detect failure

`src/lib/postScore.ts` `postScore()` is fire-and-forget: it swallows every error and returns `void`.
**There is currently no way to know whether a post succeeded**, so a naive flush would clear the
outbox on failure and lose the exact score the feature exists to protect.

**Add an async sibling** — `postScoreAwaitable(url, body): Promise<boolean>` — and have the flush
use it. Leave `postScore` itself untouched: eight games post through it today, its "never crash the
game" guarantee is load-bearing, and changing its signature would put every game's scoring path at
risk for no benefit here.

Flush **bypasses `useScoreSubmission` entirely** and calls `postScoreAwaitable` directly. The hook's
`lastPostedRef` dedup guard is in-memory only and resets on refresh, so routing a flush through it
would drop legitimate re-posts.

### Flush points

1. **On deactivate** — flush every outbox entry.
2. **On failure** — keep the entry, retry on the next deactivate.
3. **On mount** — if any entry exists, flush it immediately, even if offline mode is not active.
   This is the safety net for "player forgot to deactivate".

### Name saves

A name save while offline overwrites `displayName` on the outbox entry.

### `game_state` sync is not queued

Found-words cross-device sync (`useGameStateSync`) fails silently offline, as it does today. It
self-heals: the first word found after reconnect pushes the full `foundWords` array. **Do not queue
it** — no changes needed to that hook.

---

## 5. While offline mode is active

### Refresh and tab close

Register a `beforeunload` handler. The browser shows its own generic confirmation dialog — the
custom string is ignored by all modern browsers, so **do not spend effort wording it**. Put the real
explanation in the UI instead (§7): the player must understand *before* they act that refreshing
without a connection ends the game.

### Navigation

In-app nav links (Shell drawer, header logo, game picker) show a confirmation dialog before routing
away. Copy should say plainly that leaving without a connection ends the current round.

Prefetched game routes (§6) are the exception: navigating between the eight finished games is the
point of the feature and must not be blocked.

### Day boundary (Leksokipos only)

`src/games/leksokipos/hooks/useDayChange.ts` must read the active state and **skip its
`router.replace`** while offline mode is on. Show an in-game banner instead:

> "Today's puzzle has changed — finish and unlock to sync, then refresh for the new puzzle"

The puzzle rotates at **03:00**, not midnight.

### No passive "you're back online" banner

Deactivation is manual. ADR 0010's original reasoning holds: an automatic flush-and-unlock would
surprise a player who is deliberately staying in offline mode.

---

## 6. Activation prefetch — how cross-game play works

On activation, while the player still has a connection, prefetch the other finished games' routes so
they are in memory when the network drops.

Use Next.js route prefetching (`router.prefetch`, or `<Link prefetch>` on the drawer entries). **No
new dependency.** Prefetch only the eight finished games.

Two things to get right:

- **Prefetch is best-effort.** If it fails or has not finished, navigation to that game fails once
  offline. Consider showing activation progress, and do not report "ready" until the prefetches
  settle.
- **Prefetching populates the router cache, which has its own lifetime.** Verify empirically how
  long prefetched routes survive in Next 16 before assuming a long offline session stays navigable.
  This is the single most likely place for the feature to under-deliver — **test it against a real
  offline session before calling the feature done.**

---

## 7. State sharing and toggle placement

*(These are ticket 07's two open questions, now answered.)*

### State sharing → React context at the Shell layout level

The toggle is now a **platform** feature, not a Leksokipos feature, which dissolves the original
objection ("every page pays for one game's feature"). The Shell already needs the state to intercept
its own nav links, and the prefetch list is derived from the registry — both live at Shell level.

Use a React context provider in the Shell layout. **Do not** use the `localStorage` + `storage`
event approach: `storage` events do not fire in the originating tab, so same-tab updates would need
a manual path anyway, and it would put a second writer next to `useGameStore` — which the standing
rule reserves as the only localStorage writer.

The **Offline Score Outbox is a separate concern** and is exempt from that rule for the same reason
`leksokipos-variant` is: it is not game state and does not belong in the `wordgames:state` envelope.
Give it its own key and document it, as ADR 0010 already anticipates.

### Toggle placement → Shell drawer

Put the toggle in the Shell drawer, alongside the theme toggle. Reasons: it is platform-wide, not
per-game; it is a deliberate, infrequent action that does not need to occupy game chrome; and the
drawer is already the place a player goes for app-level switches. This also honours the original
"don't cramp the UI" note — no game's header grows.

The drawer is also where the activation explanation belongs (§5) — the player needs to read what
offline mode does *before* enabling it, and the browser's `beforeunload` dialog cannot tell them.

---

## 8. Key files

| File | Why |
|------|-----|
| `src/lib/postScore.ts` | Add `postScoreAwaitable`; leave `postScore` untouched |
| `src/hooks/useScoreSubmission.ts` | Bypassed during offline mode — do not route the flush through it |
| `src/hooks/useGameStateSync.ts` | No changes — silent failure offline is acceptable and self-heals |
| `src/games/leksokipos/hooks/useDayChange.ts` | Skip `router.replace` while active; show the banner |
| `src/components/shared/Shell.tsx` | Context provider, drawer toggle, nav interception, prefetch list |

New files expected:

- `src/hooks/useOfflineMode.ts` — active state, `beforeunload` registration, prefetch trigger
- `src/lib/offlineOutbox.ts` — outbox read/write/flush (pure where possible, so it is testable)

Keep the outbox logic pure and separately testable — flush ordering and the keep-on-failure rule are
where the bugs will be.

---

## 9. Constraints

- **No new npm dependencies** (CLAUDE.md standing rule). No service worker.
- Cold start is unsupported **by design** — §2. Do not "fix" it.
- Game logic in `src/games/*/lib/` stays pure — zero React imports.
- Semantic tokens only; reuse recipes for the toggle and banner. No literal palette classes.
- **Never `git push`.**

---

## 10. Testing

The standard three gates (`npm run test -- --run`, `npx eslint .`, `npm run build`) are necessary but
**not sufficient** here.

- **`npm run test:e2e` is mandatory** — this change touches the Shell, a shared chrome component.
  That is exactly the class of change the standing rule exists for.
- **Manual DevTools "Offline" verification is mandatory** and cannot be replaced by unit tests. At
  minimum: activate → go offline → play two different games → navigate between them → deactivate →
  confirm the Leksokipos score reached the leaderboard.
- Unit-test the outbox: keyed overwrite, keep-on-failure, mount-time flush, and the bypass of
  `useScoreSubmission`.
- Grep `.claude/aiHelper/coverageMap.md` before writing any test file.

---

## 11. Docs to update when this ships

- **`CONTEXT.md`** — the `Offline Lock` and `Offline Score Outbox` glossary entries both carry
  *"designed, not yet built"* markers and describe the **old Leksokipos-only single-entry** design.
  Both need rewriting: the term is now **Offline Mode** (platform-wide), and the outbox is keyed by
  `(gameId, puzzleDate)`.
- **ADR 0010** — already amended 2026-08-03 with the rescope. Re-read it before implementing.
- **`goals.md`** — its "Offline Lock + Score Outbox are NOT built" note needs updating on ship.

---

## 12. Suggested next steps

- `/to-tickets` — break into vertical slices. Suggested order: outbox + `postScoreAwaitable` first
  (pure, testable, no UI), then the context + toggle, then prefetch, then `useDayChange`.
- `/tdd` — implement, starting from the outbox flush logic.
- Manual offline verification per §10 before declaring done.

---

## 13. Manual verification (OPERATOR — the only outstanding work)

Automated gates cannot prove any of this. Run it in a real browser with DevTools.

> ### ⛔ Item D is a GO / NO-GO gate, not a checklist item. Run it FIRST.
>
> **D decides whether the design is viable at all.** Prefetch populates the Next router cache, which
> expires on its own schedule. If it evicts during a long offline session, cross-game navigation dies
> at exactly the moment the feature is supposed to be working — and no amount of polish on A/B/C/E/F
> compensates. A failure here is not a bug to patch: it means route prefetching is insufficient and
> the design goes back to the drawing board, realistically toward the service worker ADR 0010 has now
> rejected twice.
>
> **Run D before merging to `main`.** The other five items are ordinary verification and can follow.
> Do not let five green checks create the impression the feature is proven while D is unrun.

**A. The happy path (§1)**
1. Open `/leksokipos` online. Drawer → «✈️ Εκτός σύνδεσης». Wait for it to stop showing «⏳ Προετοιμασία…».
2. DevTools → Network → **Offline**.
3. Find a few words. Navigate to `/leksiarxeio` via the drawer — **it must load**. Play a guess.
4. Navigate back to `/leksokipos`. Find another word.
5. Network → **Online**. Drawer → toggle off.
6. Confirm the Leksokipos score appears on the leaderboard for today.

**B. The refresh guard**
- While active and offline, press F5 → the browser's confirmation dialog must appear. Cancel it.
  (The wording is the browser's own and cannot be changed — this is expected.)

**C. The nav guard**
- While active, click the header logo (🎮) → a confirmation appears. Cancel → you stay put.
- While active, click a drawer game link → **no** confirmation (this is the point of the feature).

**D. ⛔ GO / NO-GO — router-cache lifetime (§6). Run this first.**

*Minimum viable check:*
1. Open a game online. Activate Offline Mode; wait for «⏳ Προετοιμασία…» to clear.
2. DevTools → Network → **Offline**.
3. Play two different games, switching between them via the drawer. Both must load.
4. **Wait 15+ minutes without touching the tab.** (Leave it in the foreground; backgrounding adds a
   second variable — mobile tab eviction — that this check is not trying to measure.)
5. Switch games again.

*Reading the result:*
- **GO** — the switch works. Prefetch survives a realistic offline session; ship it.
- **NO-GO** — the switch fails / spins / shows an error page. The router cache evicted. **Do not
  patch around this** (longer prefetch loops, re-prefetch timers, and retry wrappers all still
  depend on a cache with an expiry you do not control). Report it; the design decision reopens.

Worth recording either way: how long you actually waited, and whether the tab stayed foregrounded.
A pass at 15 minutes is not a promise about 3 hours on a plane, which is the real user story.

**E. The forgot-to-deactivate safety net**
- Activate, go offline, score in Leksokipos, then close the tab (accept the dialog). Go online,
  reopen the site. The pending score should flush on mount — check the leaderboard.

**F. Flush failure keeps the score**
- Activate, go offline, score, then deactivate **while still offline**. The post fails; check
  `localStorage["wordgames:offline-outbox"]` still holds the entry. Go online and reload — it flushes.
