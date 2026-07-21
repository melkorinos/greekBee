# Handoff 03 — Topothesies: Data emission, UI, integration, docs close-out

**Status:** ready-for-agent (emission folded in) · **Prereq:** 02 (logic) merged. **Section 0's two operator gates are now RESOLVED (2026-07-21) — see the "Section 0 — operator gates RESOLVED" block below; start there.** This handoff **emits the real data itself** (Section 0), then builds the UI on it. · **Blocks:** none (operator play-through gates the merge)

See handoff 01 for the full locked-decision table. This handoff **emits the real data (Section 0)**, then wires it and the pure logic (02) into a playable route and closes the docs. **Reuse the platform's shared machinery — do not re-roll leaderboard/identity/shell.**

## Scope

### 0. Data emission — run FIRST (folds in the former emission session)

Produces the real `src/data/topothesies/` data everything else renders. It's a **local one-time generator** (like `npm run generate-leksoplegma` — committed output, **not** a build-time fetch), so builds stay hermetic and no route depends on geodata.gov.gr being up.

**Preconditions — operator resolves BEFORE pickup (this is the gate, now at the front, not mid-flow):**
- **Final island list signed off** — confirmed splits are locked; operator supplies the vetted DRAFT-cluster list (Cyclades / Dodecanese / NE-Aegean / Ionian) so the agent never pauses to ask. Un-peelable / too-small islands go to the Deferred list (handoff 01), not `answers.json`.
- **Raw shapefile available** — operator drops the geodata.gov.gr Kallikratis municipality shapefile into a local source dir, **or** the agent fetches it during the local run (geodata.gov.gr was flaky / `ECONNREFUSED` in testing — if the fetch fails, operator provides the file). The raw source is **not** committed to the build path; only the emitted JSON is.

**Steps:**
1. Ingest the shapefile → GeoJSON.
2. **Dissolve** to the target entries via **01's `planDissolve`** override map (drops Troizinia-Methana; Deferred islands stay inside their parent). No polygon splitting.
3. **Simplify** (mapshaper via `npx`, no saved dep) to the named vertex/byte budget.
4. **Project to 2D SVG `d` path strings** at build time (ADR 0018 — no client projection) + compute per-entry **centroid** and the dataset **max pairwise centroid distance**.
5. Emit `shapes.json` (id → path + viewBox) and `answers.json` (metadata per the 01 type), validated through **01's `validateEmitted`** (id parity, coords in `GREECE_BBOX`, no accents in `*Normalized`).
6. Set `TOPOTHESIES.PROXIMITY_MAX_KM` in `gameRules.ts` to the computed max (replaces the placeholder `0`).
7. Fill `capital` / `capitalCoord` / `aliases` / `isIsland` per entry; operator does the final correctness pass.

### 1. Route + frame
- `src/app/topothesies/` page. Frame with **`GamePageShell` + `GameHeader`**, content column **`max-w-game`** (never a literal width). `[data-game="topothesies"]` for the accent (row added in 01).
- **Finalize** the picker card content in `app/page.tsx` — 01 already added a rules **stub** (plus the registry entry + the `TOPOTHESIES` rules stub the `satisfies Record<keyof GAME_REGISTRY>` guard requires). Fill the real rules / HowToPlay copy; don't add from scratch.

### 2. Silhouette renderer
- Component under `src/components/topothesies/` that renders a shape as inline SVG from a **precomputed `d` path string** in `shapes.json` (`<svg viewBox><path d=…/></svg>`, viewBox/bbox from the data). **No client-side projection — ship no geo/projection library and do no runtime projection**; all projection is build-time (01's script). If 01 emits raw geometry rather than a path, project it in a build step, never in the browser. Whole unit incl. islets (Q7b) — **but note the Island splits (handoff 01): a shape may be a single split-off island** (Agistri, Thasos, Skyros…), not a full regional unit. The renderer must **self-frame each shape to its own bbox** so a tiny island fills the viewBox and stays guessable rather than rendering as a dot. Theme-aware fill via semantic tokens — no literal palette classes, no inline hex (ADR 0008; guards enforce).

### 2a. Payload & performance (do not skip — soul.md #1 constraint; this and the precomputed-path decision are locked in **ADR 0018** — read it first)
- It's **one deterministic daily puzzle**, so render the route **statically per day with `export const revalidate`** and **inline only *today's* silhouette path** — reuse the Leksokipos daily-prerender pattern (sessions 71/64). The full ~80-shape geometry set is a **build-time asset that never ships to the client wholesale**.
- The client needs only: today's one path + the **names** list for autocomplete (a few KB) + centroids for hints (from `answers.json`). It never needs other shapes' geometry — hints come from centroids, not paths.
- Net: bundle **and** Fluid CPU stay flat regardless of how many shapes exist. **Zero server-side geo compute at request time** (all geo work is build-time, in 01).

### 3. Guess UI
- **Autocomplete** text input seeded from `answers.json`, accent-insensitive (normalize on keystroke). **Constrain input to the answer/capital lists** — 02 no-ops invalid guesses (they don't burn a guess), so the UI must not let a typo waste an attempt. On submit, dispatch to the reducer; 02's `evaluate*` return `{ correct, hint: GeoHint | null }` (a correct guess carries `hint: null`) — render the chip from `hint`.
- Guess-history list: each row shows the guessed name + **distance chip + direction arrow + proximity %** (from the hint payload).
- **Capital stage** UI: after the shape stage resolves, reveal the unit and switch the input to capital autocomplete (3 guesses), same hint chips via `evaluateCapitalGuess`.

### 4. Results + persistence + leaderboard
- End panel: solved/failed summary, score, **share card** (`buildShareText` from 02, copy-to-clipboard like the other games).
- Persistence: new `useGameStore` `topothesies` slice (slice added in 01); reuse `useRoundPersistence` / `useLiveScorePost` / the session spine as the round games do — study `leksodromia`/`leksoplegma` boards first. **Save only `shapeGuesses`/`capitalGuesses` + `puzzleId`** and rebuild via `makeInitialTopothesiesState` + `RESTORE_STATE` (flags are derived — replay, per the 02 handoff log); `maxKm` is injected via `makeInitialTopothesiesState`, never read from the still-`0` live config.
- Leaderboard: add a `topothesies` entry to `GAME_LEADERBOARD_CONFIG` and mount the shared **`GameLeaderboardModal`** (no bespoke wrapper — that consolidation is done, ADR/session 81).

### 5. Attribution + docs close-out
- Render the **CC-BY credit line** (constant from 01) in the game's How-to-Play / info modal — this is the license obligation, not optional.
- Finalize **CONTEXT.md** glossary (regional unit, **island entry / split** — a puzzle answer is a place that is *either* a regional unit *or* a single recognizable island peeled off one per the Island splits rule, silhouette, capital stage) and update the **north-star wording** in `goals.md` from "word game platform" → "Greek games platform". Log the session in `log.md`; run the End-of-Session **Dream** (soul.md) — memory.md game table gets the new row, coverageMap.md updated.

## Gates
All three checks green — **plus Section 0's `validateEmitted` gate** and a **`performance.test.ts` payload budget** asserting the geometry that reaches the client stays under a named byte budget (soul.md: data hotpaths need a budget test), so simplification can't silently regress. Then **stop and tell the operator a manual browser play-through is required before merge** (new game category — daily selection, both stages, hints, share, leaderboard, dark/light). Do not `git push` (paid deploy — operator syncs). **Go-live = flip the registry entry `wip: true → false`** — operator decision after the play-through passes (mirrors the session-112 flag flip); it stays `wip` until then.
