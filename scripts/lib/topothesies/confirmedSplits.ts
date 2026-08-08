// confirmedSplits.ts — the LOCKED structural facts from handoff-01's "Island
// splits" table. This is the only part of the answer set that is settled now;
// the per-cluster DRAFT lists (Paros, Rhodes, Chios, Corfu, …) are deliberately
// NOT here — they need operator line-by-line sign-off before they are added.
//
// This file carries no geometry, no capitals and no coordinates — only ids and
// provenance. Curation (capital / capitalCoord / centroid / aliases) and the
// real municipality→id override map are filled once the Kallikratis shapefile
// is in hand. The pipeline feeds CONFIRMED_SPLIT_IDS into validateEmitted's
// `requiredIds` so a regression that drops a locked island fails the gate.

/**
 * The islands that MUST exist as their own entries once the confirmed splits
 * are applied (the peeled islands + whole-island units). The mainland/whole
 * remainders they were peeled from (euboea, magnesia, kavala, evros, naxos)
 * are regular units that the default dissolve produces anyway, so they are not
 * listed here — only the peels are the thing a regression could silently lose.
 */
export const CONFIRMED_SPLIT_IDS = [
  // Attica "Islands" (Νήσων) → island peels (no unit remainder). agistri/hydra/
  // poros/spetses are currently DEFERRED (low OSM fidelity) — see below.
  "aegina",
  "kythira",
  "salamis",
  // Euboea → whole island + Skyros
  "skyros",
  // Milos unit → Milos, Sifnos (kimolos/serifos DEFERRED)
  "milos",
  "sifnos",
  // Kea-Kythnos → Kea, Kythnos
  "kea",
  "kythnos",
  // Naxos → Naxos + Amorgos + the four Lesser Cyclades (POLYGON_PEELS, 2026-08-06)
  "amorgos",
  "koufonisia",
  "schoinoussa",
  "iraklia",
  "donousa",
  // Lefkada → Kalamos (POLYGON_PEELS, 2026-08-06)
  "kalamos",
  // Magnesia (mainland) → +Sporades (skiathos/skopelos DEFERRED)
  "alonnisos",
  // Kavala (mainland) → Thasos
  "thasos",
  // Evros → Samothrace is DEFERRED
] as const;

/**
 * Municipalities dropped from every target — non-islands living inside an
 * island unit. Keyed by the intent, not yet by the exact shapefile attribute
 * (the real municipality name is wired in at emission time).
 */
export const DROPPED_MUNICIPALITIES = [
  // Troizinia-Methana: a mainland peninsula in Attica's "Islands" unit — not an
  // island, so it is dropped rather than kept or peeled.
  "troizinia-methana",
] as const;

/**
 * How many of an island answer's largest polygons to keep, dropping the smaller
 * satellite islets that share its municipality. The intent is recognisability: a
 * cluster of tiny detached blobs makes the map read as a scatter and, because the
 * silhouette self-frames, forces the main island to render small.
 *
 * With the OSM feed EVERY island answer defaults to its main landmass alone (N=1,
 * applied in generateTopothesies.ts for `meta.isIsland`); this map is the small
 * OVERRIDE list of answers that are genuinely more than one comparable island and
 * must keep several. Non-island (mainland) answers keep all polygons.
 *
 * This is a DISPLAY + centroid decision only; the dropped islets were never their
 * own answers. Applied before both the path and the centroid so the drawn shape
 * and the proximity centroid stay the same geometry. Operator-tunable from the
 * preview gallery — the most likely thing to want per-island tweaks.
 */
export const MAIN_ISLAND_POLYGONS: Readonly<Record<string, number>> = {
  alonnisos: 2, // Αλόννησος + Περιστέρα
  paxi: 2, // Παξοί = Παξός + Αντίπαξος
  thira: 2, // Θήρα + Θηρασία (the caldera crescent)
  koufonisia: 2, // Άνω + Κάτω Κουφονήσι — the name is a plural, so both are drawn
};

/**
 * Islands PEELED OUT of a parent answer's dissolved geometry by polygon selection
 * rather than by δήμος attribute (2026-08-06, ticket 05). Keyed child answer id →
 * the parent it is taken from.
 *
 * `ISLAND_PEEL_WD` cannot express these: they share their parent's δήμος (Δήμος
 * Νάξου και Μικρών Κυκλάδων, Δήμος Λευκάδας), so there is no QID to key on. But
 * nothing has to be *split* either — a δήμος spanning several islands arrives from
 * OSM as a MultiPolygon with ONE POLYGON PER ISLAND, so the child is *selected*
 * out and REMOVED from the parent (generateTopothesies.applyPolygonPeels). The
 * connected-component splitting this was long assumed to need was never needed.
 *
 * `polygons` is how many of the parent's polygons the child takes, nearest-to-its-
 * capital first. It is 1 for everything except Κουφονήσια, which is genuinely two
 * islands (see MAIN_ISLAND_POLYGONS) — keep the two numbers in step, or the second
 * island is peeled off the parent and then never drawn.
 */
export const POLYGON_PEELS: Readonly<Record<string, { parent: string; polygons: number }>> = {
  koufonisia: { parent: "naxos", polygons: 2 }, // Άνω + Κάτω Κουφονήσι
  schoinoussa: { parent: "naxos", polygons: 1 },
  iraklia: { parent: "naxos", polygons: 1 },
  donousa: { parent: "naxos", polygons: 1 },
  kalamos: { parent: "lefkada", polygons: 1 },
};

/**
 * Islands deliberately NOT emitted, with the reason — so a future session reads a
 * decision here rather than an oversight and re-opens it.
 *
 * • Δήλος — uninhabited, no capital. Every answer carries a REQUIRED capital
 *   through ANSWER_META → TopothesiesAnswer → the capital bonus stage, so the only
 *   ways in are a fabricated capital or a nullable one threaded through the types,
 *   the reducer and the UI. Permanent drop (operator, 2026-08-06). It is peelable —
 *   that was never the question.
 * • Καστός — ~6 km², roughly 50 residents; shares Δήμος Λευκάδας with Κάλαμος and
 *   would peel by the same mechanism, but sits an order of magnitude below the
 *   recognisability of anything live. Deliberate omission (operator, 2026-08-06).
 */
export const DROPPED_ISLANDS: ReadonlyArray<{ readonly name: string; readonly why: string }> = [
  { name: "Δήλος", why: "uninhabited — no capital for the bonus round" },
  { name: "Καστός", why: "below the recognisability floor of every live answer" },
];

/**
 * Islands knowingly PARKED (not in v1 answers.json): they can't be peeled by a
 * municipality attribute (they share a municipality with a larger island) or
 * are too small to be a fair guess. They stay as islets inside their parent
 * shape. Curation must ADD to this list, never silently merge.
 *
 * 2026-08-06: EMPTY. The Lesser Cyclades — the only entry this list ever held —
 * are live answers of their own; sharing the Naxos δήμος turned out not to block a
 * peel at all, because the δήμος already arrives as one polygon per island (see
 * POLYGON_PEELS). Kept as the lever for the next island that genuinely cannot be
 * produced.
 */
export const DEFERRED_ISLANDS: ReadonlyArray<{
  readonly islands: string;
  readonly parkedInside: string;
  readonly why: string;
}> = [];

/**
 * Island answer ids EXCLUDED from emission (generateTopothesies drops any feature
 * assigned to one of these). Everything about a deferred island is retained —
 * ANSWER_META, the ISLAND_PEEL_WD mapping — so graduating one is just deleting its
 * id here.
 *
 * 2026-07-22: SIZE-AWARE simplification (generateTopothesies.islandIntervalM) raised
 * every small island from ~16–42 pts to ~130–400 pts, so the 28 islands deferred for
 * "low fidelity" were graduated to live after operator preview sign-off.
 *
 * 2026-08-06: EMPTY. Πόρος, the last holdout, was never a fidelity or a source
 * problem — Δήμος Πόρου owns a strip of the Argolid coast fractionally LARGER than
 * the island, so the pipeline's "draw the largest polygon" rule drew the mainland.
 * `project.polygonsBestFirst` now picks the polygon holding the answer's capital
 * instead, and Πόρος renders as the real island. Keep this set — it is the one-line
 * lever for parking an answer whose geometry is wrong.
 */
export const DEFERRED_ANSWER_IDS: ReadonlySet<string> = new Set<string>([]);

/**
 * Islands with no geometry at all — the preview renders them as flagged
 * placeholder cards so the «Νομοί & Νησιά» list stays complete and the missing
 * work is visible. They have no ANSWER_META and never reach the live game.
 *
 * 2026-08-06: EMPTY (ticket 05). All six entries are resolved. Five became real
 * answers via POLYGON_PEELS — the premise that put them here, "they need
 * connected-component polygon splitting the pipeline doesn't have", was simply
 * wrong: a multi-island δήμος already arrives as one polygon per island, so they
 * only ever needed selecting. Δήλος was dropped permanently (DROPPED_ISLANDS).
 * Kept as the lever for the next island that has no geometry to emit.
 */
export const CANT_PEEL_PLACEHOLDERS: ReadonlyArray<{
  readonly id: string;
  readonly name: string;
  readonly capital: string;
  readonly parkedInside: string;
}> = [];
