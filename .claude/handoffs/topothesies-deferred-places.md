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

## Also parked (not islands)
- **Troizinia-Methana** — dropped entirely (mainland peninsula, not read as an island). Not an answer, not deferred; recorded here so we remember it was intentionally excluded.

## v2 notes
- Peeling any of the "can't peel" rows needs polygon-level (connected-component) splitting — a real pipeline capability we chose not to build for v1.
- The "operator call" rows are cheap to promote later (each is its own municipality) if we decide the answer set should go deeper.
