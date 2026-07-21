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
  // Attica "Islands" (Νήσων) → 7 island peels (no unit remainder)
  "aegina",
  "agistri",
  "hydra",
  "kythira",
  // poros deferred (v2) — geoBoundaries silhouette doesn't read as the real
  // island; see DEFERRED_ISLANDS.
  "salamis",
  "spetses",
  // Euboea → whole island + Skyros
  "skyros",
  // Milos unit → Kimolos, Milos, Serifos, Sifnos
  "kimolos",
  "milos",
  "serifos",
  "sifnos",
  // Kea-Kythnos → Kea, Kythnos
  "kea",
  "kythnos",
  // Naxos → Naxos (+deferred Lesser Cyclades) + Amorgos
  "amorgos",
  // Magnesia (mainland) → +Sporades
  "skiathos",
  "skopelos",
  "alonnisos",
  // Kavala (mainland) → Thasos
  "thasos",
  // Evros (mainland) → Samothrace
  "samothrace",
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
 * Islands whose emitted shape must keep only its N largest polygons by area,
 * dropping the smaller satellite islets that share the municipality. The intent
 * is recognisability: a cluster of tiny detached blobs makes the map read as a
 * scatter and, because the silhouette self-frames, forces the main island to
 * render small. Keeping just the main body (N=1) — or the two real islands for
 * Alonnisos (Alonnisos + Peristera; N=2) — lets the shape zoom in.
 *
 * This is a DISPLAY + centroid decision only; the dropped islets were never
 * their own answers. Ids not listed here keep every polygon (e.g. Thira, Poros).
 * Applied in generateTopothesies.ts before both the path and the centroid so the
 * drawn shape and the proximity centroid stay the same geometry.
 */
export const MAIN_ISLAND_POLYGONS: Readonly<Record<string, number>> = {
  alonnisos: 2,
  antiparos: 1,
  astypalaia: 1,
  chania: 1,
  corfu: 1,
  hydra: 1,
  ikaria: 1,
  kalymnos: 1,
  kea: 1,
  kimolos: 1,
  kythira: 1,
  lemnos: 1,
  leros: 1,
  naxos: 1,
  nisyros: 1,
  psara: 1,
  rhodes: 1,
  syros: 1,
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
  {
    islands: "Poros",
    parkedInside: "(dropped — no parent)",
    why: "own municipality, but its geoBoundaries silhouette doesn't read as the real island; deferred for a higher-res source (handoff #3)",
  },
];
