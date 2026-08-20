# E2E coverage analysis — what is guaranteed, and what is not

Written 2026-08-20 against ISSUE-03. Numbers verified by `npx playwright test --list`
and a route/registry sweep, not from the issue text (which was written at 10 tests).

## 1. The measured baseline

- **15 e2e tests in 5 spec files**: 13 run, 2 permanently skipped (`offlineMode`,
  skipped on purpose — they are acceptance criteria for a feature that does not exist).
- **213 unit/component test files** under `src/test/`.
- **One Playwright project**: `chromium`, Desktop Chrome, 1280×720. No mobile project,
  no second browser, no dark-mode run.
- Page objects exist for **3 of 11** Games: Leksokipos, Leksiarxeio, Leksindeseis
  (the last is a heading locator only).

## 2. What a browser currently guarantees

| Guarantee | Tests | Games it covers |
| --- | --- | --- |
| Route returns 200 and renders its `h1` | 6 | leksokipos, leksiarxeio, leksindeseis, posokanei, logopaignio, /privacy |
| A player can actually play a turn | **2** | leksokipos (submit word), leksiarxeio (switch length, score one guess) |
| State survives a reload | **1** | leksokipos only |
| Shared chrome is not duplicated | 2 | /profile and / render exactly one `<header>`, one 👤 button |
| Drawer navigation reaches a destination | 1 | drawer → /privacy from a game page |
| Hidden Games are unlisted but reachable | 3 | picker excludes 3 hrefs; posokanei + logopaignio load by URL |
| Nothing pushes privacy at the player | 1 | no `/privacy` link on the landing page |

That is the whole browser-verified surface. Everything else in the product is
guaranteed only by jsdom, which has no layout engine, no CSS, and no real routing.

## 3. What is not covered at all

### 3.1 Routes never loaded by any browser test — 6 of 11 Games

`/vres-tin-frasi`, `/leksodromia`, `/leksoplegma`, `/topothesies`, `/stavrolekso`
(plus `/stavrolekso/[id]` and `/stavrolekso/maker`), `/leksikastirio`.

All six are **launched and unhidden**; three of them are capability-bearing —
Λεξοδρομία, Λεξόπλεγμα, Τοποθεσίες. (Stavrolekso and Λεξικαστήριο never declared a
capability, and Βρες τη Φράση lost both on 2026-08-20, ADR 0027 — after this file was
measured.) A build that renders a blank page or throws on hydration for any of the six
ships green, capability or not.

### 3.2 Gameplay never exercised in a browser — 9 of 11 Games

Only Leksokipos and Leksiarxeio have a turn driven end to end. For the rest the
reducers are heavily unit-tested, and the *wiring between reducer, hook, page and DOM
event* is tested nowhere a real browser runs.

### 3.3 Whole feature classes with zero browser coverage

- **End of round.** `endgame-panel`, `round-recap`, `btn-share-result`,
  `btn-leaderboard`, `achievement-toast` — no test opens any of them, for any Game.
  The most player-visible moment in the product is browser-untested.
- **Leaderboard.** `GameLeaderboardModal` / `LeaderboardModal` never opened.
- **Profile.** Only the header count is asserted. Stats strip, trophy case, name
  editor, words-by-length never render in a browser against real API routes.
- **API routes.** 26 route handlers, all tested with mocks in vitest, none exercised
  through a real request from a real page.
- **Persistence.** Reload-rehydration proven for one Game; the `useGameStore` slice
  contract is otherwise jsdom-only.
- **Archive navigation.** leksiarxeio / vrestifrasi / posokanei have archive tests in
  jsdom, none in a browser.
- **Mobile layout.** Everything runs at 1280×720. The 320 px header-wrap risk recorded
  in `reflections.md` cannot be caught by anything currently running.
- **Theme.** No dark-mode pass; the "badges render invisibly" failure mode from
  `reflections.md` stays invisible.
- **Sound, help modal, feedback modal, nomination modal** — jsdom only.

## 4. The cost is lower than ISSUE-03 assumes

The issue prices expansion as "eight new specs, each needing a stable selector
strategy". That is pessimistic: **the stable selectors already exist.** These testids
are already in `src/games` / `src/components` and are what a happy-path spec needs:

`game-board`, `guess-grid`, `group-grid`, `word-input`, `btn-enter`, `btn-share`,
`btn-share-result`, `btn-leaderboard`, `endgame-panel`, `round-recap`, `total-score`,
`score-bar`, `found-words-count`, `shape-guesses`, `capital-guesses`,
`posokanei-guesses`, `logopaignio-guesses`, `answer-row`, `nomination-card`,
`vote-up-button`, `trophy-tile`, `stats-skeleton`.

What is missing is page objects and specs, not instrumentation. Two input traps are
already solved in the existing page objects and should be reused: Greek text cannot be
delivered via `keyboard.type()` (click the `aria-label="Letter Χ"` buttons instead),
and the drawer must be closed with `Escape`, not a backdrop click.

## 5. Candidate expansions, ordered

Priority is "basic functionality guaranteed, happy paths" — breadth before depth.

### Tier A — one happy path per launched Game (the actual ask)

**Ticketed 2026-08-20** as TICKET-17, TICKET-19 and TICKET-20. Three specs, one per
Game. Each: load, make one legal move, assert the game state visibly changed. No
end-of-round, no scoring assertions.

**Three of the six are deliberately out**, all by operator ruling on 2026-08-20:

- **Stavrolekso** — three routes plus a maker flow, so one happy path would
  misrepresent it. Never ticketed.
- **Topothesies** and **Leksikastirio** — low priority next to the other three.
  Ticketed and withdrawn the same day (TICKET-18, TICKET-21; both ids retired in the
  `SPENT` ledger). The work went back onto ISSUE-03's deferred list.

Those five routes therefore keep zero browser coverage of any kind.

**Pin the content.** Every daily Game accepts `?puzzle=YYYY-MM-DD`
(`resolvePuzzleDateParam`), and selection is a pure function of the date over committed
JSON. A pinned past date makes the puzzle, the valid input and the correct answer
deterministic, instead of leaving the spec at the mercy of whatever rotates in that
morning.

**Never finish a round.** Score submission fires at round end and writes to the shared
production `game_scores`, which is append-forever. One move, assert, stop.

| # | Game | Happy path | Assertion | Notes |
| --- | --- | --- | --- | --- |
| TICKET-17 | Vres Tin Frasi | submit one valid phrase guess via the on-screen keyboard | first guess row shows scored tiles | mirrors the Leksiarxeio spec almost exactly; `src/components/vrestifrasi/Keyboard.tsx` has the same `Letter Χ` labels |
| TICKET-19 | Leksodromia | unscramble one word | word count / score advances | timed Game — assert state, never elapsed time |
| TICKET-20 | Leksoplegma | trace one hidden word on the grid | found-word count increments | needs a stepped pointer drag; riskiest of the five, so do it last |

Note for whoever picks the deferred three back up: a Leksikastirio spec must be
**read-only** — load, tabs, open and cancel the nomination modal. A vote is a real
write that shapes the dictionary, and no test suite should be casting them.

### Tier B — cheap breadth, do first (about an hour, highest value per line)

| # | Candidate | Why |
| --- | --- | --- |
| B1 | Table-driven smoke test over `GAME_REGISTRY`: every `href` returns 200 and renders its `h1` | closes the "6 routes never loaded" gap in one test, and a new Game enrols automatically |
| B2 | The same table at a 390×844 mobile viewport, asserting no horizontal overflow | the only thing that can catch the header-wrap class of bug |
| B3 | The drawer lists every non-hidden Game and each link navigates | shared chrome has the highest blast radius and exactly one navigation test |

### Tier C — the moment that matters most to a player

| # | Candidate | Why |
| --- | --- | --- |
| C1 | Leksokipos: play to a finished round, assert `endgame-panel` + `btn-share-result` are visible | end-of-round is browser-untested for every Game |
| C2 | Open the leaderboard modal from a Game header, assert rows or an empty state | read-only, no DB writes |
| C3 | Reload-rehydration for a second Game (Leksiarxeio) | proves the store contract generalises beyond Leksokipos |

### Tier D — later, larger

| # | Candidate | Why deferred |
| --- | --- | --- |
| D1 | Profile page against real API routes | needs a seeded identity; touches the shared production DB |
| D2 | Offline outbox: queue a score offline, come back online, assert it posts | real value, real complexity |
| D3 | Dark-mode visual pass | needs a screenshot-comparison decision first |
| D4 | Un-skip `offlineMode.spec.ts` | blocked on the service worker ADR 0010 has twice declined |

## 6. Constraints anyone doing this work must respect

- **The shared production database.** Every Game with the `scores` capability posts to
  the real `game_scores`, which is append-forever. Prefer custom/unranked puzzle URLs
  (the Leksokipos flow test already does this), assert before the post, or use a
  throwaway identity. No Tier A spec should casually finish a ranked round.
- **The cold-chunk flake.** A stale Turbopack chunk makes `/` fail with
  `Runtime SyntaxError: Unexpected end of JSON input`; it survives re-runs and passes in
  isolation. The fix is `Remove-Item -Recurse -Force .next`, not a retry. Read the
  `e2e cold-chunk flake` row in `memory.md` before growing the suite.
- Playwright is Desktop-Chrome-only today; B2 needs a second project in
  `playwright.config.ts`, which roughly doubles run time for the specs it includes.

## 7. Recommendation

**Operator ruling, 2026-08-20: three Tier A specs, in ticket order.** TICKET-17 (Vres
Tin Frasi) sets the page-object and pinned-puzzle pattern, then TICKET-19
(Leksodromia), then TICKET-20 (Leksoplegma) last because the drag is the hardest input
to make non-flaky. Stavrolekso, Topothesies and Leksikastirio stay deferred in ISSUE-03.

Tier B stays the cheapest breadth available and is still worth doing after: three tests,
no new page objects, taking browser route coverage from 5 of 11 to 11 of 11 including a
mobile viewport. It remains deferred in ISSUE-03, mainly because B2 needs a second
Playwright project. Tier C after that.
