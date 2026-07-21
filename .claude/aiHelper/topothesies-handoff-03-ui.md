# Handoff 03 — Topothesies: Data emission, UI, integration, docs close-out

**Status:** ready-for-agent (emission folded in) · **Prereq:** 02 (logic) merged. **Section 0's two operator gates are now RESOLVED (2026-07-21) — see the "Section 0 — operator gates RESOLVED" block below; start there.** This handoff **emits the real data itself** (Section 0), then builds the UI on it. · **Blocks:** none (operator play-through gates the merge)

See handoff 01 for the full locked-decision table. This handoff **emits the real data (Section 0)**, then wires it and the pure logic (02) into a playable route and closes the docs. **Reuse the platform's shared machinery — do not re-roll leaderboard/identity/shell.**

## Scope

### 0. Data emission — run FIRST (folds in the former emission session)

Produces the real `src/data/topothesies/` data everything else renders. It's a **local one-time generator** (like `npm run generate-leksoplegma` — committed output, **not** a build-time fetch), so builds stay hermetic and no route depends on geodata.gov.gr being up.

**Preconditions — operator resolves BEFORE pickup (this is the gate, now at the front, not mid-flow):**
- **Final island list signed off** — confirmed splits are locked; operator supplies the vetted DRAFT-cluster list (Cyclades / Dodecanese / NE-Aegean / Ionian) so the agent never pauses to ask. Un-peelable / too-small islands go to the Deferred list (handoff 01), not `answers.json`.
- **Raw shapefile available** — operator drops the geodata.gov.gr Kallikratis municipality shapefile into a local source dir, **or** the agent fetches it during the local run (geodata.gov.gr was flaky / `ECONNREFUSED` in testing — if the fetch fails, operator provides the file). The raw source is **not** committed to the build path; only the emitted JSON is.

---

## Section 0 — operator gates RESOLVED (2026-07-21). **Fresh agent: start here.**

Both preconditions are cleared. This block records everything the 2026-07-21 operator session
settled, so you skip all the re-derivation.

**SOURCE — LOCKED = geoBoundaries GRC-ADM3.**
- File in hand: `scripts/lib/topothesies/source/geoBoundaries-GRC-ADM3.geojson` (**gitignored** — raw
  source never enters the build path, ADR 0018). 326 municipalities, EPSG:4326 lon/lat (**no
  reprojection**), ~1.7 MB, CC0/public-domain.
- **geodata.gov.gr is dead** — `ECONNREFUSED`/timeout for both operator and agent. Do NOT retry it.
- **GISCO/Eurostat was evaluated and REJECTED** (verified against live data): Greek NUTS3 = 52 units
  at the wrong granularity — it lumps ALL Cyclades into one feature (`"Andros, Thira, Kea, Milos,
  Mykonos, Naxos, Paros, Syros, Tinos"`) and MERGES units we split (`"Thasos, Kavala"`, `"Magnisia,
  Sporades"`). NUTS3 ≠ regional unit for Greece. Don't reopen the source question.
- geoBoundaries ADM levels: ADM1=8, ADM2=**14** (≈ the 13 regions/περιφέρειες), ADM3=**326**
  (municipalities). **There is NO regional-unit (~74) layer** — and that IS our answer level. It is
  neither ADM2 (too coarse) nor ADM3 (too fine).

**⚠ THE ONE NEW SUB-PROBLEM Section 0 must solve: a municipality→regional-unit map.**
- `planDissolve` needs `MunicipalityRecord{name, regionalUnit}`, but geoBoundaries ADM3 properties are
  only `shapeName`/`shapeID` — **no parent RU attribute**. So you must supply muni→RU for the ~280
  mainland/large-island municipalities. (Island answers map 1:1 municipality→id — no dissolve.)
- **Open decision (settle with operator before building the map):** source it from **(a)** an
  authoritative reachable dataset — Wikidata `P131` (muni → περιφερειακή ενότητα) via SPARQL, or
  Wikipedia's per-regional-unit municipality lists — committed as a checked-in table; or **(b)**
  hand-curate. **Recommend (a)** — hand-typing ~280 rows from memory is error-prone. Whatever the
  source, commit it as data and let `validateEmitted` + the operator's final answer-list review guard
  correctness. This is the biggest remaining unknown; the handoff originally assumed the (dead)
  geodata.gov.gr file carried RU natively, so this map is genuinely new work.

**NAME RECONCILIATION (geoBoundaries shapeName → our id).** Mostly clean Latin, direct matches
verified present: Aegina, Poros, Spetses, Kythira, Kimolos, Milos, Serifos, Sifnos, Amorgos, Anafi,
Kea, Skiathos, Skopelos, Alonnisos, Skyros, Antiparos, Folegandros, Sikinos, Psara, Oinousses, Leros,
Astypalaia, Patmos, Kasos, Nisyros, Symi, Kastellorizo, Meganisi, Troizinia-Methana (the drop). **4
irregular** need an explicit map: `Ydra`→hydra, `Samothrakis`→samothrace, `Thassou`→thasos,
`Paxos`→paxi. **Ios**: confirm its exact ADM3 shapeName at ingest — it did NOT exact-match "Ios"
(Δ. Ιητών may be labelled differently).

**ISLAND SPLITS — FINAL, signed off.** Full record + rationale: `.claude/aiHelper/topothesies-island-signoff.md`.
Beyond the already-locked `confirmedSplits.ts`:
- **PEEL** (own answer entry, keeps capital stage): Antiparos, Ios, Folegandros, Sikinos, Anafi
  (Cyclades) · Leros, Astypalaia, Patmos, Kasos, Nisyros, Symi, Kastellorizo (Dodecanese) · Psara,
  Oinousses (NE Aegean) · Paxi (Ionian).
- **DEFER** (islets inside parent — append to `DEFERRED_ISLANDS`, note for v2): Lipsi, Agathonisi
  (Kalymnos) · Tilos, Chalki (Rhodes) · Fournoi (Ikaria) · Agios Efstratios (Lemnos) · Diapontia
  (Corfu) · Meganisi (Lefkada) · **Delos** (part of Δ. Μυκόνου + uninhabited → no capital) ·
  **Kalamos/Kastos** (part of Δ. Λευκάδας). **No polygon splitting in v1** — operator confirmed.

**TOOLING.** mapshaper works via `npx --yes mapshaper` (v0.7.46) — **no dep install, no approval
needed**. Use it for `-dissolve` (keyed by the `planDissolve` assignments) and `-simplify`.

**AGREED TDD SEAMS (pre-confirmed, per the /tdd skill):** (a) `planDissolve` against the real
geoBoundaries municipality-name set → exactly the target answer set (all peels present, drops
excluded, mainland grouped via the muni→RU map); (b) a new pure `scripts/lib/topothesies/project.ts`
— `projectPoint` (equirectangular, cos(refLat) x-scale, SVG y-down), `ringToPath`, `computeViewBox`
(per-shape self-framing so a tiny island fills its viewBox), area-weighted `centroidLngLat`,
`maxPairwiseCentroidKm` (reuse the game's `haversineKm`, don't re-roll); (c) `validateEmitted` green
on the emitted files; (d) `performance.test.ts` byte budget on today's inlined path. The hint math
(`haversineKm`/`bearingToArrow`/`proximityPct`) already lives in `src/games/topothesies/lib/geo.ts`.

**RESIDUE from the 2026-07-21 session (clean — nothing half-built):** `.gitignore` now ignores
`scripts/lib/topothesies/source/`; `topothesies-island-signoff.md` is the decision record. No pipeline
code was written — the build starts fresh at the seams above.

---

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
