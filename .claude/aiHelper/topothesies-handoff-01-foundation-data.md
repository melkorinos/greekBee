# Handoff 01 — Topothesies: Foundation + Data pipeline

**Status:** ready-for-agent (rev: island-splits folded 2026-07-21) · **Prereq:** none (critical path) · **Blocks:** 02, 03
**Internal id:** `topothesies` (permanent — routes/types/dirs; display name is WIP/TBD)

New game category: a **Worldle-style Greek geography game**. Player sees a silhouette of a
Greek **regional unit** (περιφερειακή ενότητα) and guesses it, then its capital. This handoff
delivers the config scaffolding + the static geo data everything else builds on. **No gameplay
code** — that's 02 (logic) and 03 (UI).

## Locked decisions (whole feature — do not re-litigate)

| # | Decision |
|---|----------|
| Unit | Regional units (~74), **split into per-island entries** wherever a unit is a cluster of distinct, separately-recognizable islands — see the **Island splits** section below. Reverses the earlier "sub-island entries deferred" call. Final answer count is the curated set (~70–90), **not** a fixed ~40. |
| Loop | Stage 1: guess unit from silhouette, **4 guesses**. Stage 2: guess its capital, **3 guesses** (bonus). |
| Hints | Full Worldle: after each wrong guess show **distance (km) + 8-way direction arrow + proximity %**, scaled to the dataset's real max pairwise distance (NOT the globe). Applies to both stages. |
| Islands (Q7) | Render the **whole unit** including satellite islets. Revert to crop-to-dominant-island only if the operator calls it too noisy. |
| Input | Autocomplete seeded from the answer list, **accent-insensitive** (no-accents invariant — reuse `normalizeLetters`). |
| Score | Points scale with shape guesses remaining (of 4) + capital bonus scaling with capital guesses remaining (of 3). Per-puzzle daily leaderboard, existing machinery. Knobs in `gameRules.ts`. |
| Data | **geodata.gov.gr**, CC-BY → commercial OK **with attribution**. Build-time dissolve municipalities→regional units + simplify (mapshaper). Static files only; **zero server-side geo compute** (soul.md Fluid-CPU rule). GADM is banned (non-commercial). |
| Identity | Platform widens from "word games" to "Greek **games**". Ships **wip:true**, display name TBD. |

## Island splits (curation rule — folded in this revision)

**Rule (locked):**
- One entry per **distinct, separately-recognizable island**.
- **Never subdivide a single contiguous island** by municipality (Euboea stays one shape — Chalcis included; only the genuinely-separate Skyros peels off).
- **Drop non-islands** from island units (Troizinia-Methana is a mainland peninsula — dropped, not many Greeks read it as an island).
- Applies to **mainland units that contain a distinct island** too: peel the island out as its own entry, the mainland remainder stays one unit.
- **Municipality-clean splits only (v1):** an island becomes its own entry **only if it is a separate municipality** (clean attribute peel). An island that shares a municipality with a larger island (can't be peeled by attribute) **or** is judged too small/insignificant is **NOT peeled in v1** — it stays as islets inside its parent shape and is **recorded in the Deferred islands list** below (marked, so we know it's parked). **No polygon-level geometry splitting in v1.**
- **Capital stage:** island entries **keep** Stage 2 (guess-the-capital), same as mainland units.

**Confirmed splits (locked):**

| Source regional unit | Becomes |
|---|---|
| Attica — Islands (Νήσων) | Aegina, Agistri, Hydra, Kythira, Poros, Salamis, Spetses (7; drop Troizinia-Methana) |
| Euboea | Euboea (whole island incl. Chalcis), Skyros |
| Milos | Kimolos, Milos, Serifos, Sifnos |
| Kea-Kythnos | Kea, Kythnos |
| Naxos | Naxos (Lesser Cyclades ride along as islets — **Deferred**), Amorgos |
| Magnesia (mainland) | Magnesia (mainland remainder) + Sporades peeled off: Skiathos, Skopelos, Alonnisos |
| Kavala (mainland) | Kavala (mainland remainder), Thasos |
| Evros (mainland) | Evros (mainland remainder), Samothrace |

**Deferred islands (marked — knowingly parked, NOT in v1 `answers.json`):**
Islands that can't be peeled by municipality attribute (share a municipality with a larger island) **or** are too small/insignificant to be a fair guess. They stay as islets inside their parent shape and get a row here so we know they're deferred, not forgotten — revisit later (may need polygon-level splitting). **Curation must ADD to this list, not silently merge.**

| Deferred island(s) | Why | Parked inside |
|---|---|---|
| Lesser Cyclades (Koufonisia, Schoinoussa, Iraklia, Donousa) | Same municipality as Naxos — no attribute peel | Naxos shape |

**Still DRAFT — needs operator line-by-line sign-off (NOT locked):** the full per-cluster island list for every *other* Aegean/Ionian cluster not in the table above — e.g. Cyclades: Paros (+Antiparos), Thira (+Ios, Sikinos, Folegandros, Anafi); Dodecanese: Kalymnos, Karpathos, Kos, Rhodes clusters; NE Aegean: Chios (+Psara, Oinousses), Ikaria (+Fournoi), Lemnos (+Agios Efstratios); Ionian: Corfu (+Paxi), Lefkada (+Meganisi). Draft the full list, get sign-off before finalizing `answers.json`. Any island the operator marks too-small/insignificant, or that turns out to share a municipality with a larger island, goes to the **Deferred islands** list above (not silently dropped). **The operator will personally verify the final list for correctness.**

## Scope of THIS handoff

### 1. Config / registry / persistence scaffolding
- `src/config/games.ts`: add `topothesies` to `GAME_REGISTRY` — `wip: true`, placeholder emoji (🗺️), `label`/`title`/`description` as WIP placeholders, `href: "/topothesies"`.
- `src/config/gameRules.ts`: add a `TOPOTHESIES` block — `SHAPE_GUESSES: 4`, `CAPITAL_GUESSES: 3`, scoring knobs (base points per shape-guess-left, capital bonus per capital-guess-left), and a `PROXIMITY_MAX_KM` const (leave a `TODO` to set from the computed dataset max in step 2). Nothing hardcoded elsewhere.
- `src/types/index.ts`: add `"topothesies"` to `SliceId` **and** an envelope key on `PersistenceEnvelope`.
- **9th accent surface** (ADR 0009): add a `[data-game="topothesies"]` accent row across all surfaces and update the guard tests that assert every registered game has an accent (they currently pin 8 — they will fail until updated). Pick a placeholder accent (e.g. an earthy/green) — real colour is a redesign-epic decision.

### 2. Data pipeline (the meat)
Write a committed script under `scripts/` (tsx, matches the ADR 0015 style). It must:
1. Ingest the geodata.gov.gr Kallikratis municipality boundaries (shapefile/GeoJSON — see Sources). Commit the raw source or a fetch step; document which.
2. **Dissolve** municipalities → target entries. Default target = the regional unit (mapshaper `-dissolve` on the regional-unit attribute). **For the Confirmed splits the dissolve target is the individual island** — but every such island is a *separate municipality*, so this stays a clean attribute regroup via a committed per-unit override map (municipality → target entry). Excluded municipalities (e.g. Troizinia-Methana) are dropped. **Deferred-list islands are NOT peeled** — they stay dissolved into their parent shape (Lesser Cyclades remain within Naxos). **No polygon-level splitting in v1.**
3. **Simplify** to a sane vertex budget (mapshaper `-simplify`) — target small enough to bundle; islets kept (Q7b).
4. Compute a **centroid** `[lng, lat]` per unit.
5. Emit two static files to `src/data/topothesies/`:
   - `shapes.json` — per unit: `id`, simplified geometry (or a pre-projected SVG `path` + `viewBox`/bbox for framing).
   - `answers.json` — per unit: `id`, `name` (Greek), `nameNormalized`, `capital`, `capitalNormalized`, `capitalCoord [lng,lat]`, `centroid [lng,lat]`, `aliases[]`, `region` (parent περιφέρεια), `isIsland`.
6. Compute and record the **max pairwise centroid distance** → feed `TOPOTHESIES.PROXIMITY_MAX_KM`.

> **mapshaper is a new dependency** — get explicit operator approval before installing (CLAUDE.md: no new deps without approval). It can also run via `npx` without a saved dep — prefer that.

### 3. Curation (needs operator input)
- Produce the curated answer list per the **Island splits** rule (~70–90 entries). The confirmed splits are locked; the remaining per-cluster island lists are DRAFT — draft them, get operator line-by-line sign-off before finalizing `answers.json`. Any island that can't be peeled (shared municipality) or is too small/insignificant → **add it to the Deferred islands list** (marked, not silently merged). Operator will personally verify the final list.
- Fill `capital`, `capitalCoord`, `aliases` per entry (manual/curated). Mark `isIsland`.
- Add the CC-BY attribution string as a config constant (consumed by 03's info modal).

### 4. ADR (decisions are known now)
- Write a new ADR under `docs/adr/` recording: admin level = regional units, the CC-BY data source + attribution obligation, the build-time-dissolve/static-only pipeline, and the platform widening to "Greek games". Add a memory.md pointer row + a CONTEXT.md glossary stub (`regional unit`, `silhouette`, capital-stage) — 03 finalizes CONTEXT/north-star.

## Deliverable to 02/03
The two data files + their TypeScript types (define a `TopothesiesAnswer` / `TopothesiesShape` type in `src/games/topothesies/types.ts`). 02 builds pure logic against these types; 03 renders them.

## Gates
`npm run test -- --run`, `npx eslint .`, `npm run build` all green. Build the data pipeline **test-first (`/tdd`)**. Seams to test: (a) the **split-mapping** — the per-unit override dissolves to exactly the confirmed island set and excludes dropped municipalities (Troizinia-Methana absent); (b) the **emitted data files** — every answer has a matching shape id, every confirmed split island is present, coords in Greece's bbox, no accents in `*Normalized` fields. Update the accent guard test.

## Sources
- geodata.gov.gr boundaries: https://geodata.gov.gr/en/group/boundaries
- Kallikratis municipality boundaries: https://geodata.gov.gr/en/dataset/oria-demon-kallikrates
- Regional units list (for the curated ~40 + capitals): https://en.wikipedia.org/wiki/Regional_units_of_Greece
