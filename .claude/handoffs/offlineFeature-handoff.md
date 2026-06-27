# Handoff — Offline Play Feature (SHELVED mid-design)

**Status:** Shelved during a `/grill-with-docs` session, before any code or ADR was written. No files changed. Picking this back up means resuming the grill (5 unanswered questions below) → ADR → implementation.

**Date shelved:** 2026-06-22

---

## Goal

The platform lives online but is accidentally playable offline (a friend played a full game on a flight; the score reached the leaderboard after landing). The user wants to (a) understand the current offline behaviour, (b) make it a *deliberate, reliable* feature, and (c) define the offline happy-flow. Acknowledged constraint from the user: players will still need to go online eventually to fetch the next day's puzzle.

---

## Investigation findings (current state — verified in code)

**There is NO deliberate offline support.** No service worker, no PWA manifest, no offline outbox/retry queue. The flight success was accidental + fragile.

What works offline today:
- **Gameplay is fully client-side.** Game pages are async server components that load puzzle data from statically-imported JSON ([src/data/leksokipos/index.ts](../../src/data/leksokipos/index.ts)). The client receives a puzzle object that already embeds its `validWords` / word-pool, so validation + scoring + rank run with zero network. Logic in `src/games/*/lib/` is pure.
- **Progress persists locally** via [src/hooks/useRoundPersistence.ts](../../src/hooks/useRoundPersistence.ts) → `localStorage` key `wordgames:state`. No network.

What does NOT work offline:
- **Cold start fails.** Pages are server-rendered (e.g. [src/app/leksokipos/page.tsx:19](../../src/app/leksokipos/page.tsx#L19) is `async`). Opening a URL fresh while offline → browser "no internet" page. The tab must already be loaded before signal is lost.
- **Scores are silently dropped offline.** [src/hooks/useScoreSubmission.ts:15-21](../../src/hooks/useScoreSubmission.ts#L15-L21) is fire-and-forget `fetch(...).catch(()=>{})`. Same for game-state sync [src/hooks/useGameStateSync.ts](../../src/hooks/useGameStateSync.ts). No retry, no queue.
- **No `online` event listener** anywhere (grep-confirmed).

Why the flight score reached the server (the subtle bit): in [useScoreSubmission.ts:53-54](../../src/hooks/useScoreSubmission.ts#L53-L54) the in-memory `lastPostedRef` advances *before* the fetch, so it advances even when the offline POST fails. The score only got through because of **continued interaction after reconnect** — finding ≥1 more word (re-fires `submit` with a higher score) or saving a name (`submitWithName` bypasses the guard). A puzzle finished entirely offline with no post-landing interaction would have lost its score.

Current realistic offline happy-flow (no code changes): load page online before flight → keep tab open → play (works) → **don't refresh/navigate** (would white-screen) → on landing, *interact* (find a word or open leaderboard) to push the final score.

---

## Relevant existing artifacts (do not re-derive)

- **ADR 0003** `docs/adr/0003-game-state-cross-device-sync.md` — `game_state` table sync (Leksokipos found-words; push-after-word, pull-on-mount; requires ProfileLinked). Any outbox must coexist with this, not duplicate it.
- **CONTEXT.md** — full glossary; `game_state` table documented at line ~136. No offline/outbox/installable vocabulary yet — those terms need minting.
- **Session 43** (`.claude/aiHelper/log.md`) — added `src/games/leksokipos/hooks/useDayChange.ts`: online-only redirect on day change / stale CDN page. Offline mode interacts with this at the midnight boundary.
- **CLAUDE.md standing rule** — no new dependencies without explicit approval (gates the SW-tooling choice).

---

## Open design questions (grill round 1 — ASKED, NOT YET ANSWERED)

Each had a recommended answer; the user shelved before responding. Resume here.

1. **Installable PWA vs SW-only?** — Rec: **full installable PWA** (only thing surviving "closed tab / rebooted phone on the plane").
2. **SW tooling: Serwist vs next-pwa vs hand-rolled?** — Rec: **Serwist** (App Router + Vercel/ISR; next-pwa unmaintained; hand-rolled cache-versioning is a footgun). **Needs explicit dependency approval per CLAUDE.md.**
3. **Offline cold-start scope?** — Rec: the four daily games (Leksokipos, Leksiarxeio, Leksindeseis, Vres Tin Frasi), today's puzzle only. **Exclude Stavrolekso + Custom/Community** (DB-fetched at request time, inherently online).
4. **Score outbox — what to queue + flush trigger?** — Rec: queue **leaderboard `game_scores` only** (game_state restore is already idempotent via pull-on-mount); flush via **`online` event + flush-on-app-load**, NOT Background Sync API (iOS/Safari unsupported, and iOS is the flight audience).
5. **Day-boundary staleness (offline across midnight)?** — Rec: serve last-cached puzzle stamped with its real `puzzle_date`; reconcile via existing `useDayChange` on reconnect; late outbox flush lands on the correct day because `game_scores` is keyed by `puzzle_date`.

Deeper branches not yet reached: cache-update/refresh UX, exact "you're offline" indicator behaviour (global shell badge vs per-game; `navigator.onLine` vs reachability), manifest/icon assets, precaching *future* days' puzzles.

---

## Two ADRs anticipated (when un-shelved)

- Installable PWA + offline scope decision (Q1+Q3).
- Score outbox + flush-on-reconnect semantics (Q4).

---

## Suggested skills for the next session

- **`/grill-with-docs`** — resume the grill from the 5 questions above; mint CONTEXT.md offline terms inline as they resolve.
- **`/to-prd`** then **`/to-issues`** — once the design settles, turn it into a spec + vertical-slice issues.
- **`/run`** / **`/verify`** — to confirm offline behaviour empirically (DevTools "Offline" throttling) before and after implementation.
