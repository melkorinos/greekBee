# Topothesies — Deferred places (v2 backlog)

Durable record of every place we knowingly parked out of the v1 `answers.json`, so nothing is
forgotten. Extracted 2026-07-21 from the (now-deleted) island sign-off + handoffs before cleanup.
**Code home:** `DEFERRED_ISLANDS` in `src/games/topothesies/lib/confirmedSplits.ts` (testable);
this doc is the human-readable collection + the *why*.

**Rule that put them here:** no polygon splitting in v1 — an island can only become its own answer
if it is its own municipality in geoBoundaries ADM3. Anything sharing a municipality with a larger
island (or judged too small / no real capital) rides along as islets inside its parent shape.

## Can't peel in v1 (shares a municipality — attribute peel impossible)
| Deferred | Parent shape | Why |
|---|---|---|
| Lesser Cyclades — Koufonisia, Schoinoussa, Iraklia, Donousa | Naxos | Same municipality as Naxos (Δ. Νάξου και Μικρών Κυκλάδων) |
| Delos | Mykonos | Part of Δ. Μυκόνου **and** uninhabited → no capital |
| Kalamos, Kastos | Lefkada | Part of Δ. Λευκάδας |

## Deferred by operator call (too small / low-recognition — revisit in v2)
| Deferred | Parent shape |
|---|---|
| Lipsi, Agathonisi | Kalymnos |
| Tilos, Chalki | Rhodes |
| Fournoi | Ikaria |
| Agios Efstratios | Lemnos |
| Diapontia | Corfu |
| Meganisi | Lefkada |

## Deferred after the OSM swap — silhouette fidelity still insufficient (refine & re-add)
The geometry source was swapped to OpenStreetMap admin_level=7 (real coastlines; handoff-outline-fidelity phase 2, 2026-07-21). It sharpened most islands, but on operator review these **22** still don't read well enough to be a fair guess. They are NOT removed — everything (ANSWER_META, ISLAND_PEEL_WD mapping) is retained; they're excluded from emission via **`DEFERRED_ANSWER_IDS`** in `confirmedSplits.ts`. Re-adding one = delete its id there once a higher-fidelity geometry is found (denser OSM extract, a physical `place=island` outline, or a manual trace).

`agistri · anafi · antiparos · folegandros · hydra · ikaria · kasos · kastellorizo · kimolos · nisyros · oinousses · patmos · poros · psara · samothrace · serifos · sikinos · skiathos · skopelos · spetses · symi · syros`

(Πόρος: its geoBoundaries outline was broken; OSM gives a real 90-pt island shape but the operator still parked it with this batch pending refinement.)

## Attica — restructured, not deferred (2026-07-21)
- **Αθήνα and Πειραιάς removed permanently** — the dense urban units don't read as silhouettes.
- Replaced by a single **`attica` (Αττική)** answer = all of mainland Attica dissolved (the 4 Athens sectors + Piraeus + East + West Attica). The Attica **islands** stay their own answers. `east-attica`/`west-attica`/`athina`/`piraeus` ANSWER_META removed.
- **Θήρα renamed to Σαντορίνη** (id `thira` unchanged — UI string only); old name kept as an alias.

## Also parked (not islands)
- **Troizinia-Methana** — dropped entirely (mainland peninsula, not read as an island). Not an answer, not deferred; recorded here so we remember it was intentionally excluded.

## Target final unit list — «Νομοί και Νησιά της Ελλάδας»
The answer set should ultimately be reconciled against the canonical Greek prefecture
list: **Νομοί της Ελλάδας** — https://el.wikipedia.org/wiki/Νομοί_της_Ελλάδας. Plan:
1. Take the νομοί (prefectures) as the mainland/large-unit backbone.
2. **Break the island collections down into separate units** (each significant island its
   own answer), rather than leaving them bundled inside a prefecture/regional unit.
3. Publish the combined result as the definitive list and label it **«Νομοί και Νησιά της
   Ελλάδας»** in the game's help/How-to-Play screen, so players know exactly what category
   of place they're being asked to identify (prefectures + islands).

This supersedes the ad-hoc regional-unit set: the fidelity-deferred islands above and the
"can't peel"/"operator call" rows all get resolved against this final list.

## v2 notes
- Peeling any of the "can't peel" rows needs polygon-level (connected-component) splitting — a real pipeline capability we chose not to build for v1.
- The "operator call" rows are cheap to promote later (each is its own municipality) if we decide the answer set should go deeper.
- The 22 fidelity-deferred islands are the live backlog for a **separate deferred handoff** (raise their fidelity, then clear from `DEFERRED_ANSWER_IDS`), reconciled against the «Νομοί και Νησιά» list above.
