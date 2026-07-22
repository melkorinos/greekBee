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
  // Naxos → Naxos (+deferred Lesser Cyclades) + Amorgos
  "amorgos",
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
};

/**
 * Islands knowingly PARKED (not in v1 answers.json): they can't be peeled by a
 * municipality attribute (they share a municipality with a larger island) or
 * are too small to be a fair guess. They stay as islets inside their parent
 * shape. Curation must ADD to this list, never silently merge.
 */
export const DEFERRED_ISLANDS: ReadonlyArray<{
  readonly islands: string;
  readonly parkedInside: string;
  readonly why: string;
}> = [
  {
    islands: "Lesser Cyclades (Koufonisia, Schoinoussa, Iraklia, Donousa)",
    parkedInside: "naxos",
    why: "share the Naxos municipality — no attribute peel possible in v1",
  },
];

/**
 * Island answer ids EXCLUDED from emission (generateTopothesies drops any feature
 * assigned to one of these). Their OSM admin_level=7 silhouette is still not
 * high-fidelity enough to be a fair guess (operator review, 2026-07-21). Unlike a
 * hard removal, everything about them is retained — ANSWER_META, the ISLAND_PEEL_WD
 * mapping — so re-adding one is just deleting its id here, once a higher-fidelity
 * geometry is found for it. Tracked for refinement in the deferred-places doc.
 */
export const DEFERRED_ANSWER_IDS: ReadonlySet<string> = new Set([
  "agistri", "anafi", "antiparos", "folegandros", "hydra", "ikaria", "kasos",
  "kastellorizo", "kimolos", "nisyros", "oinousses", "patmos", "poros", "psara",
  "samothrace", "serifos", "sikinos", "skiathos", "skopelos", "spetses", "symi",
  "syros",
  // Promoted from backlog 2026-07-22 (own-δήμος, peelable) — deferred for fidelity
  // work; ANSWER_META + ISLAND_PEEL_WD added, excluded from live emission here.
  "meganisi", "agios-efstratios", "fournoi", "tilos", "chalki", "lipsi", "agathonisi",
]);

/**
 * Islands promoted to deferred but NOT peelable in v1 — they share a δήμος with a
 * larger island, so an attribute peel can't produce them; they need connected-
 * component polygon splitting the pipeline doesn't have yet. They have no
 * ANSWER_META / geometry: the preview renders them as flagged placeholder cards so
 * the final list is complete and the polygon-split work is visible. (2026-07-22)
 */
export const CANT_PEEL_PLACEHOLDERS: ReadonlyArray<{
  readonly id: string;
  readonly name: string;
  readonly capital: string;
  readonly parkedInside: string;
}> = [
  { id: "koufonisia", name: "Κουφονήσια", capital: "Άνω Κουφονήσι", parkedInside: "naxos" },
  { id: "schoinoussa", name: "Σχοινούσα", capital: "Χώρα Σχοινούσας", parkedInside: "naxos" },
  { id: "iraklia", name: "Ηρακλειά", capital: "Άγιος Γεώργιος", parkedInside: "naxos" },
  { id: "donousa", name: "Δονούσα", capital: "Σταυρός", parkedInside: "naxos" },
  { id: "delos", name: "Δήλος", capital: "—", parkedInside: "mykonos" },
  { id: "kalamos", name: "Κάλαμος", capital: "Κάλαμος", parkedInside: "lefkada" },
];
