// curation.ts — the COMMITTED source of truth for the Topothesies answer set.
//
// Two things live here, both operator-reviewable data (ADR 0018 step 7 — "the
// operator does the final correctness pass"):
//
//   1. The assignment maps that turn a geoBoundaries GRC-ADM3 municipality into
//      an answer id: island peels/drops (the signoff in
//      `topothesies-island-signoff.md`), the Athens-sector merge, and the
//      regional-unit → id table for everything that dissolves whole.
//   2. ANSWER_META — the name / capital / capitalCoord / region / isIsland /
//      aliases for every answer id. Names + capital towns are hand-curated
//      Greek; capitalCoord + region are sourced from Wikidata (P36/P131) at
//      generation time and baked in as literals so the build needs no network.
//
// Geometry (path, viewBox, centroid) is NOT here — it is computed from the
// gitignored shapefile at emission and joined by id (scripts/generateTopothesies.ts).
//
// PROVENANCE / v1 curation decisions the operator should sanity-check:
//   • Municipality→regional-unit was resolved by spatial nearest-match of each
//     ADM3 polygon centroid to a Wikidata municipality point (74 RUs, 2 hand
//     fixes below). Not a hand-typed table.
//   • Attica: ALL of mainland Attica (the 4 Athens sectors + Piraeus + East +
//     West Attica) is MERGED into one `attica` peninsula silhouette — the urban
//     units don't read as individual shapes. The Attica ISLANDS stay separate.
//   • Some island answers are DEFERRED (confirmedSplits.DEFERRED_ANSWER_IDS): their
//     OSM silhouette isn't high-fidelity enough yet, so they're excluded from
//     emission (their ANSWER_META / peel mappings stay, to re-add after refining).

import type { LngLat } from "../../../src/games/topothesies/types";

export interface CuratedAnswerMeta {
  name: string;
  capital: string;
  capitalCoord: LngLat;
  region: string;
  isIsland: boolean;
  aliases: string[];
}

/** Municipalities excluded from every answer (non-islands inside an island RU). */
export const DROPS: ReadonlySet<string> = new Set(["Troizinia-Methana"]);

/**
 * geoBoundaries shapeName → answer id, for islands that PEEL from their regional
 * unit (their own entry). Everything not here dissolves into its RU via
 * RU_TO_ID, so deferred islets (which share their parent's RU) need no entry.
 */
export const ISLAND_OVERRIDES: Readonly<Record<string, string>> = {
  Salamina: "salamis", Aegina: "aegina", Agistri: "agistri", Ydra: "hydra",
  Kythira: "kythira", Spetses: "spetses",
  // Poros deferred (v2): its geoBoundaries silhouette doesn't read as the real
  // island. Dropping the override lets its municipality fall into Νήσων (a
  // __split__ unit with no remainder) → dropped. See DEFERRED_ISLANDS.
  Serifos: "serifos", Sifnos: "sifnos", Kimolos: "kimolos", Milos: "milos",
  Alonnisos: "alonnisos", Skiathos: "skiathos", Skopelos: "skopelos",
  Kea: "kea", Kithnos: "kythnos", Paros: "paros", Antiparos: "antiparos",
  Amorgos: "amorgos", Sikinos: "sikinos", Folegandros: "folegandros",
  Anafi: "anafi", Iiton: "ios",
  Nisyros: "nisyros", Symi: "symi", Kastellorizo: "kastellorizo",
  Oinousses: "oinousses", Psara: "psara", Kasos: "kasos",
  Leros: "leros", Patmos: "patmos", Astypalaia: "astypalaia",
  Paxos: "paxi", Skyros: "skyros", Samothrakis: "samothrace",
};

/**
 * A few geoBoundaries municipalities whose Wikidata P131 skips the regional unit
 * and points straight at the region — spatial match still lands on them, so we
 * pin the intended RU by shapeName.
 */
export const RU_FIX: Readonly<Record<string, string>> = {
  Thessaloniki: "Περιφερειακή Ενότητα Θεσσαλονίκης",
  Sparta: "Περιφερειακή Ενότητα Λακωνίας",
};

/** True when a regional-unit label is one of the four Athens urban sectors. */
export function isAthensSector(ruEl: string): boolean {
  return /Τομέα Αθηνών/.test(ruEl);
}

/**
 * Regional-unit label (Wikidata el) → answer id for everything that dissolves
 * whole: mainland units, whole-island units, and the "remainder" id of a split
 * unit (its non-peeled municipalities). `"__split__"` marks a unit with no
 * remainder — every one of its municipalities is an island peel (or the single
 * drop), so this value must never reach an answer.
 */
export const RU_TO_ID: Readonly<Record<string, string>> = {
  "Περιφερειακή Ενότητα Ημαθίας": "imathia", "Περιφερειακή Ενότητα Κιλκίς": "kilkis",
  "Περιφερειακή Ενότητα Θεσσαλονίκης": "thessaloniki", "Περιφερειακή Ενότητα Σερρών": "serres",
  "Περιφερειακή Ενότητα Πέλλας": "pella", "Περιφερειακή Ενότητα Πιερίας": "pieria",
  "Περιφερειακή Ενότητα Αιτωλοακαρνανίας": "aetolia-acarnania", "Περιφερειακή Ενότητα Ηλείας": "ilia",
  "Περιφερειακή ενότητα Αχαΐας": "achaia", "Περιφερειακή Ενότητα Γρεβενών": "grevena",
  "Περιφερειακή Ενότητα Κοζάνης": "kozani", "Περιφερειακή Ενότητα Καστοριάς": "kastoria",
  "Περιφερειακή Ενότητα Φλώρινας": "florina", "Περιφερειακή Ενότητα Καρδίτσας": "karditsa",
  "Περιφερειακή Ενότητα Λάρισας": "larisa", "Περιφερειακή Ενότητα Μαγνησίας": "magnesia",
  "Περιφερειακή Ενότητα Τρικάλων": "trikala", "Περιφερειακή Ενότητα Ιωαννίνων": "ioannina",
  "Περιφερειακή ενότητα Πρέβεζας": "preveza", "Περιφερειακή Ενότητα Θεσπρωτίας": "thesprotia",
  "Περιφερειακή ενότητα Άρτας": "arta", "Περιφερειακή Ενότητα Φθιώτιδας": "fthiotida",
  "Περιφερειακή ενότητα Βοιωτίας": "viotia", "Περιφερειακή Ενότητα Ευρυτανίας": "evrytania",
  "Περιφερειακή Ενότητα Φωκίδας": "fokida", "Περιφερειακή Ενότητα Δράμας": "drama",
  "Περιφερειακή Ενότητα Καβάλας": "kavala", "Περιφερειακή Ενότητα Ροδόπης": "rodopi",
  "Περιφερειακή Ενότητα Ξάνθης": "xanthi", "Περιφερειακή Ενότητα Έβρου": "evros",
  "Περιφερειακή Ενότητα Λασιθίου": "lasithi", "Περιφερειακή Ενότητα Χανίων": "chania",
  "Περιφερειακή ενότητα Ρεθύμνου": "rethymno", "Περιφερειακή Ενότητα Ηρακλείου": "heraklion",
  "Περιφερειακή Ενότητα Αρκαδίας": "arkadia", "Περιφερειακή Ενότητα Αργολίδας": "argolida",
  "Περιφερειακή Ενότητα Κορινθίας": "korinthia", "Περιφερειακή Ενότητα Λακωνίας": "lakonia",
  "Περιφερειακή Ενότητα Μεσσηνίας": "messinia", "Περιφερειακή ενότητα Χαλκιδικής": "chalkidiki",
  "Περιφερειακή Ενότητα Ευβοίας": "euboea", "Περιφερειακή Ενότητα Κέρκυρας": "corfu",
  "Περιφερειακή Ενότητα Καλύμνου": "kalymnos",
  "Περιφερειακή Ενότητα Καρπάθου-Ηρωικής Νήσου Κάσου": "karpathos",
  "Περιφερειακή Ενότητα Ρόδου": "rhodes", "Περιφερειακή Ενότητα Χίου": "chios",
  "Περιφερειακή ενότητα Θήρας": "thira", "Περιφερειακή Ενότητα Νάξου": "naxos",
  "Περιφερειακή ενότητα Κω": "kos", "Περιφερειακή Ενότητα Ζακύνθου": "zakynthos",
  "Περιφερειακή Ενότητα Θάσου": "thasos", "Περιφερειακή Ενότητα Ιθάκης": "ithaca",
  "Περιφερειακή Ενότητα Ικαρίας": "ikaria", "Περιφερειακή Ενότητα Κεφαλληνίας": "kefalonia",
  "Περιφερειακή Ενότητα Λέσβου": "lesbos", "Περιφερειακή Ενότητα Λήμνου": "lemnos",
  "Περιφερειακή Ενότητα Σάμου": "samos", "Περιφερειακή ενότητα Άνδρου": "andros",
  "Περιφερειακή ενότητα Σύρου": "syros", "Περιφερειακή ενότητα Τήνου": "tinos",
  "Περιφερειακή Ενότητα Μυκόνου": "mykonos", "Περιφερειακή Ενότητα Λευκάδας": "lefkada",
  "Περιφερειακή Ενότητα Κέας - Κύθνου": "__split__", "Περιφερειακή Ενότητα Μήλου": "__split__",
  "Περιφερειακή Ενότητα Πάρου": "__split__", "Περιφερειακή Ενότητα Σποράδων": "__split__",
  "Περιφερειακή Ενότητα Νήσων": "__split__",
  // All of mainland Attica dissolves into ONE «Αττική» peninsula silhouette:
  // the urban units (Athens sectors via isAthensSector, Piraeus) don't read as
  // individual shapes, so East + West Attica + Piraeus + the Athens sectors are
  // merged. The Attica ISLANDS (Νήσων RU) stay their own answers via ISLAND_PEEL_WD.
  "Περιφερειακή Ενότητα Ανατολικής Αττικής": "attica",
  "Περιφερειακή Ενότητα Δυτικής Αττικής": "attica",
  "Περιφερειακή Ενότητα Πειραιώς": "attica",
};

/**
 * Assign a geoBoundaries municipality to its answer id (or null = dropped).
 * Order: drop wins, then an island peel, then the Athens merge, then the RU.
 * Retained for the per-id geoBoundaries FALLBACK path (see GEOBOUNDARIES_FALLBACK_IDS
 * in generateTopothesies.ts) — the primary feed is now OSM (assignOsm below).
 */
export function assignTarget(shapeName: string, matchedRuEl: string | null): string | null {
  if (DROPS.has(shapeName)) return null;
  if (ISLAND_OVERRIDES[shapeName]) return ISLAND_OVERRIDES[shapeName];
  const ru = RU_FIX[shapeName] ?? matchedRuEl;
  if (ru && isAthensSector(ru)) return "attica";
  const id = ru ? RU_TO_ID[ru] : undefined;
  if (!id || id === "__split__") return null;
  return id;
}

// ── OSM (admin_level=7 δήμοι) assignment — the primary geometry feed ──────────
//
// The join is keyed on the OSM relation's own Wikidata QID (immutable, unlike
// the Greek name variants), resolved once against the committed adm7 dump:
//   • ISLAND_PEEL_WD — δήμοι that PEEL from their regional unit into their own
//     answer (islands). QID → answer id. Comments carry the δήμος name.
//   • DROP_WD — δήμοι excluded from every answer (a non-island inside an island RU).
//   • MUNI_RU_FIX_WD — δήμοι whose Wikidata parent skips the regional unit (points
//     at the region/metro), pinned straight to their answer id.
// Everything else resolves via its municipality's regional unit (parentEl in
// wd-munis.json, matched by QID) → RU_TO_ID, with the Athens sectors merged.

/** OSM δήμος Wikidata QID → island-peel answer id. */
export const ISLAND_PEEL_WD: Readonly<Record<string, string>> = {
  Q12875764: "salamis", Q25162122: "aegina", Q20917269: "agistri", Q16642582: "hydra",
  Q1493246: "kythira", Q21573016: "spetses", Q217214: "serifos", Q212029: "sifnos",
  Q919194: "kimolos", Q203979: "milos", Q647941: "alonnisos", Q25162005: "skiathos",
  Q25162028: "skopelos", Q214109: "kea", Q739779: "kythnos", Q201272: "paros",
  Q216985: "antiparos", Q208587: "amorgos", Q747935: "sikinos", Q213902: "folegandros",
  Q217253: "anafi", Q216993: "ios", Q767528: "nisyros", Q20379364: "symi",
  Q212096: "kastellorizo", Q12875738: "oinousses", Q16330107: "psara", Q11874074: "kasos",
  Q426893: "leros", Q3897657: "patmos", Q20030234: "astypalaia", Q719518: "paxi",
  Q208566: "skyros", Q25413502: "samothrace",
  Q3908531: "poros", // returned in the OSM swap — its silhouette reads correctly
};

/** OSM δήμος QIDs excluded from every answer (non-island inside an island RU). */
export const DROP_WD: ReadonlySet<string> = new Set([
  "Q1536340", // Δήμος Τροιζηνίας - Μεθάνων (mainland peninsula in Attica's Νήσων RU)
]);

/** OSM δήμος QIDs whose Wikidata parent isn't the regional unit — pinned by id. */
export const MUNI_RU_FIX_WD: Readonly<Record<string, string>> = {
  Q6627746: "thessaloniki", // Δήμος Θεσσαλονίκης — parent is the region, not the RU
  Q992450: "lakonia",       // Δήμος Σπάρτης
  Q2232240: "attica",      // Δήμος Νίκαιας - Αγίου Ιωάννη Ρέντη (Piraeus RU -> Attica)
};

/**
 * Assign an OSM δήμος to its answer id (or null = dropped/foreign).
 * `ru` is the municipality's regional-unit label (wd-munis.json parentEl, joined
 * by QID; spatial-nearest fallback for the few δήμοι missing from that dump).
 * Order: QID drop → QID peel → QID RU-fix → Athens merge → regional unit.
 */
export function assignOsm(wikidata: string | null, ru: string | null): string | null {
  if (wikidata) {
    if (DROP_WD.has(wikidata)) return null;
    if (ISLAND_PEEL_WD[wikidata]) return ISLAND_PEEL_WD[wikidata];
    if (MUNI_RU_FIX_WD[wikidata]) return MUNI_RU_FIX_WD[wikidata];
  }
  if (ru && isAthensSector(ru)) return "attica";
  const id = ru ? RU_TO_ID[ru] : undefined;
  if (!id || id === "__split__") return null;
  return id;
}

export const ANSWER_META: Readonly<Record<string, CuratedAnswerMeta>> = {
  "achaia": { name: "Αχαΐα", capital: "Πάτρα", capitalCoord: [21.734911, 38.246383], region: "Δυτικής Ελλάδας", isIsland: false, aliases: [] },
  "aegina": { name: "Αίγινα", capital: "Αίγινα", capitalCoord: [23.4275, 37.74667], region: "Αττικής", isIsland: true, aliases: [] },
  "aetolia-acarnania": { name: "Αιτωλοακαρνανία", capital: "Μεσολόγγι", capitalCoord: [21.428889, 38.368611], region: "Δυτικής Ελλάδας", isIsland: false, aliases: [] },
  "agistri": { name: "Αγκίστρι", capital: "Μεγαλοχώρι", capitalCoord: [23.333333, 37.7], region: "Αττικής", isIsland: true, aliases: [] },
  "alonnisos": { name: "Αλόννησος", capital: "Πατητήρι", capitalCoord: [23.9175, 39.217222], region: "Θεσσαλίας", isIsland: true, aliases: [] },
  "amorgos": { name: "Αμοργός", capital: "Χώρα Αμοργού", capitalCoord: [25.898193, 36.831849], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "anafi": { name: "Ανάφη", capital: "Χώρα Ανάφης", capitalCoord: [25.7884, 36.3522], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "andros": { name: "Άνδρος", capital: "Χώρα Άνδρου", capitalCoord: [24.933333, 37.833333], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "antiparos": { name: "Αντίπαρος", capital: "Αντίπαρος", capitalCoord: [25.042222, 36.9925], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "argolida": { name: "Αργολίδα", capital: "Ναύπλιο", capitalCoord: [22.8, 37.565833], region: "Πελοποννήσου", isIsland: false, aliases: [] },
  "arkadia": { name: "Αρκαδία", capital: "Τρίπολη", capitalCoord: [22.375, 37.508333], region: "Πελοποννήσου", isIsland: false, aliases: [] },
  "arta": { name: "Άρτα", capital: "Άρτα", capitalCoord: [20.9875, 39.165], region: "Ηπείρου", isIsland: false, aliases: [] },
  "astypalaia": { name: "Αστυπάλαια", capital: "Χώρα Αστυπάλαιας", capitalCoord: [26.35, 36.55], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "attica": { name: "Αττική", capital: "Αθήνα", capitalCoord: [23.727539, 37.983917], region: "Αττικής", isIsland: false, aliases: ["αττικη"] },
  "chalkidiki": { name: "Χαλκιδική", capital: "Πολύγυρος", capitalCoord: [23.668611, 40.222778], region: "Κεντρικής Μακεδονίας", isIsland: false, aliases: [] },
  "chania": { name: "Χανιά", capital: "Χανιά", capitalCoord: [24.016667, 35.516667], region: "Κρήτης", isIsland: false, aliases: [] },
  "chios": { name: "Χίος", capital: "Χίος", capitalCoord: [26.1375, 38.3725], region: "Βορείου Αιγαίου", isIsland: true, aliases: [] },
  "corfu": { name: "Κέρκυρα", capital: "Κέρκυρα", capitalCoord: [19.921389, 39.623889], region: "Ιονίων Νήσων", isIsland: true, aliases: ["κερκυρα"] },
  "drama": { name: "Δράμα", capital: "Δράμα", capitalCoord: [24.139167, 41.151389], region: "Ανατολικής Μακεδονίας και Θράκης", isIsland: false, aliases: [] },
  "euboea": { name: "Εύβοια", capital: "Χαλκίδα", capitalCoord: [23.595, 38.4625], region: "Στερεάς Ελλάδας", isIsland: true, aliases: ["ευβοια"] },
  "evros": { name: "Έβρος", capital: "Αλεξανδρούπολη", capitalCoord: [25.866667, 40.85], region: "Ανατολικής Μακεδονίας και Θράκης", isIsland: false, aliases: [] },
  "evrytania": { name: "Ευρυτανία", capital: "Καρπενήσι", capitalCoord: [21.795, 38.9121], region: "Στερεάς Ελλάδας", isIsland: false, aliases: [] },
  "florina": { name: "Φλώρινα", capital: "Φλώρινα", capitalCoord: [21.408889, 40.782778], region: "Δυτικής Μακεδονίας", isIsland: false, aliases: [] },
  "fokida": { name: "Φωκίδα", capital: "Άμφισσα", capitalCoord: [22.375278, 38.525278], region: "Στερεάς Ελλάδας", isIsland: false, aliases: [] },
  "folegandros": { name: "Φολέγανδρος", capital: "Χώρα Φολεγάνδρου", capitalCoord: [24.90139, 36.6311], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "fthiotida": { name: "Φθιώτιδα", capital: "Λαμία", capitalCoord: [22.442593, 38.902996], region: "Στερεάς Ελλάδας", isIsland: false, aliases: [] },
  "grevena": { name: "Γρεβενά", capital: "Γρεβενά", capitalCoord: [21.4275, 40.085], region: "Δυτικής Μακεδονίας", isIsland: false, aliases: [] },
  "heraklion": { name: "Ηράκλειο", capital: "Ηράκλειο", capitalCoord: [25.134444, 35.340278], region: "Κρήτης", isIsland: false, aliases: [] },
  "hydra": { name: "Ύδρα", capital: "Ύδρα", capitalCoord: [23.466667, 37.35], region: "Αττικής", isIsland: true, aliases: [] },
  "ikaria": { name: "Ικαρία", capital: "Άγιος Κήρυκος", capitalCoord: [26.5, 37.566667], region: "Βορείου Αιγαίου", isIsland: true, aliases: [] },
  "ilia": { name: "Ηλεία", capital: "Πύργος", capitalCoord: [21.4395, 37.673], region: "Δυτικής Ελλάδας", isIsland: false, aliases: [] },
  "imathia": { name: "Ημαθία", capital: "Βέροια", capitalCoord: [22.201944, 40.520278], region: "Κεντρικής Μακεδονίας", isIsland: false, aliases: [] },
  "ioannina": { name: "Ιωάννινα", capital: "Ιωάννινα", capitalCoord: [20.852222, 39.663611], region: "Ηπείρου", isIsland: false, aliases: [] },
  "ios": { name: "Ίος", capital: "Χώρα Ίου", capitalCoord: [25.281667, 36.723056], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "ithaca": { name: "Ιθάκη", capital: "Βαθύ", capitalCoord: [20.7202, 38.3647], region: "Ιονίων Νήσων", isIsland: true, aliases: [] },
  "kalymnos": { name: "Κάλυμνος", capital: "Πόθια", capitalCoord: [26.983333, 36.983333], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "karditsa": { name: "Καρδίτσα", capital: "Καρδίτσα", capitalCoord: [21.921944, 39.364722], region: "Θεσσαλίας", isIsland: false, aliases: [] },
  "karpathos": { name: "Κάρπαθος", capital: "Πηγάδια", capitalCoord: [27.133333, 35.583333], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "kasos": { name: "Κάσος", capital: "Φρυ", capitalCoord: [26.918333, 35.393333], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "kastellorizo": { name: "Καστελλόριζο", capital: "Καστελλόριζο", capitalCoord: [29.583333, 36.15], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "kastoria": { name: "Καστοριά", capital: "Καστοριά", capitalCoord: [21.268761, 40.518131], region: "Δυτικής Μακεδονίας", isIsland: false, aliases: [] },
  "kavala": { name: "Καβάλα", capital: "Καβάλα", capitalCoord: [24.40687, 40.93959], region: "Ανατολικής Μακεδονίας και Θράκης", isIsland: false, aliases: [] },
  "kea": { name: "Κέα", capital: "Ιουλίδα", capitalCoord: [24.30646, 37.62466], region: "Νοτίου Αιγαίου", isIsland: true, aliases: ["τζια"] },
  "kefalonia": { name: "Κεφαλονιά", capital: "Αργοστόλι", capitalCoord: [20.647527, 38.251409], region: "Ιονίων Νήσων", isIsland: true, aliases: ["κεφαλληνια"] },
  "kilkis": { name: "Κιλκίς", capital: "Κιλκίς", capitalCoord: [22.8765, 40.9954], region: "Κεντρικής Μακεδονίας", isIsland: false, aliases: [] },
  "kimolos": { name: "Κίμωλος", capital: "Χώρα Κιμώλου", capitalCoord: [24.57678, 36.80077], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "korinthia": { name: "Κορινθία", capital: "Κόρινθος", capitalCoord: [22.927222, 37.938611], region: "Πελοποννήσου", isIsland: false, aliases: [] },
  "kos": { name: "Κως", capital: "Κως", capitalCoord: [27.287028, 36.893833], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "kozani": { name: "Κοζάνη", capital: "Κοζάνη", capitalCoord: [21.78896, 40.30069], region: "Δυτικής Μακεδονίας", isIsland: false, aliases: [] },
  "kythira": { name: "Κύθηρα", capital: "Χώρα Κυθήρων", capitalCoord: [22.987903, 36.149669], region: "Αττικής", isIsland: true, aliases: [] },
  "kythnos": { name: "Κύθνος", capital: "Χώρα Κύθνου", capitalCoord: [24.41732, 37.39189], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "lakonia": { name: "Λακωνία", capital: "Σπάρτη", capitalCoord: [22.429444, 37.073889], region: "Πελοποννήσου", isIsland: false, aliases: [] },
  "larisa": { name: "Λάρισα", capital: "Λάρισα", capitalCoord: [22.416667, 39.641667], region: "Θεσσαλίας", isIsland: false, aliases: [] },
  "lasithi": { name: "Λασίθι", capital: "Άγιος Νικόλαος", capitalCoord: [25.717268, 35.18916], region: "Κρήτης", isIsland: false, aliases: [] },
  "lefkada": { name: "Λευκάδα", capital: "Λευκάδα", capitalCoord: [20.767222, 38.648333], region: "Ιονίων Νήσων", isIsland: true, aliases: [] },
  "lemnos": { name: "Λήμνος", capital: "Μύρινα", capitalCoord: [25.06186, 39.878652], region: "Βορείου Αιγαίου", isIsland: true, aliases: [] },
  "leros": { name: "Λέρος", capital: "Άγια Μαρίνα", capitalCoord: [26.75989, 37.1292], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "lesbos": { name: "Λέσβος", capital: "Μυτιλήνη", capitalCoord: [26.20694, 39.23278], region: "Βορείου Αιγαίου", isIsland: true, aliases: ["μυτιληνη"] },
  "magnesia": { name: "Μαγνησία", capital: "Βόλος", capitalCoord: [22.9425, 39.361111], region: "Θεσσαλίας", isIsland: false, aliases: [] },
  "messinia": { name: "Μεσσηνία", capital: "Καλαμάτα", capitalCoord: [22.111111, 37.037778], region: "Πελοποννήσου", isIsland: false, aliases: [] },
  "milos": { name: "Μήλος", capital: "Πλάκα", capitalCoord: [24.506667, 36.709167], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "mykonos": { name: "Μύκονος", capital: "Μύκονος", capitalCoord: [25.32872, 37.44529], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "naxos": { name: "Νάξος", capital: "Χώρα Νάξου", capitalCoord: [25.379444, 37.101944], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "nisyros": { name: "Νίσυρος", capital: "Μανδράκι", capitalCoord: [27.0943, 36.5953], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "oinousses": { name: "Οινούσσες", capital: "Οινούσσες", capitalCoord: [26.231125, 38.521867], region: "Βορείου Αιγαίου", isIsland: true, aliases: [] },
  "paros": { name: "Πάρος", capital: "Παροικιά", capitalCoord: [25.19213, 37.05929], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "patmos": { name: "Πάτμος", capital: "Χώρα Πάτμου", capitalCoord: [26.541667, 37.327222], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "paxi": { name: "Παξοί", capital: "Γάιος", capitalCoord: [20.161389, 39.2075], region: "Ιονίων Νήσων", isIsland: true, aliases: ["παξοσ"] },
  "pella": { name: "Πέλλα", capital: "Έδεσσα", capitalCoord: [22.05, 40.8], region: "Κεντρικής Μακεδονίας", isIsland: false, aliases: [] },
  "pieria": { name: "Πιερία", capital: "Κατερίνη", capitalCoord: [22.5084, 40.2711], region: "Κεντρικής Μακεδονίας", isIsland: false, aliases: [] },
  "poros": { name: "Πόρος", capital: "Πόρος", capitalCoord: [23.458889, 37.500556], region: "Αττικής", isIsland: true, aliases: [] },
  "preveza": { name: "Πρέβεζα", capital: "Πρέβεζα", capitalCoord: [20.751667, 38.9575], region: "Ηπείρου", isIsland: false, aliases: [] },
  "psara": { name: "Ψαρά", capital: "Ψαρά", capitalCoord: [25.56287, 38.54097], region: "Βορείου Αιγαίου", isIsland: true, aliases: [] },
  "rethymno": { name: "Ρέθυμνο", capital: "Ρέθυμνο", capitalCoord: [24.473889, 35.368889], region: "Κρήτης", isIsland: false, aliases: [] },
  "rhodes": { name: "Ρόδος", capital: "Ρόδος", capitalCoord: [28.216667, 36.433333], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "rodopi": { name: "Ροδόπη", capital: "Κομοτηνή", capitalCoord: [25.4, 41.116667], region: "Ανατολικής Μακεδονίας και Θράκης", isIsland: false, aliases: [] },
  "salamis": { name: "Σαλαμίνα", capital: "Σαλαμίνα", capitalCoord: [23.5, 37.933333], region: "Αττικής", isIsland: true, aliases: [] },
  "samos": { name: "Σάμος", capital: "Σάμος", capitalCoord: [26.705061, 37.791658], region: "Βορείου Αιγαίου", isIsland: true, aliases: [] },
  "samothrace": { name: "Σαμοθράκη", capital: "Χώρα Σαμοθράκης", capitalCoord: [25.52222, 40.47333], region: "Ανατολικής Μακεδονίας και Θράκης", isIsland: true, aliases: [] },
  "serifos": { name: "Σέριφος", capital: "Χώρα Σερίφου", capitalCoord: [24.5, 37.15], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "serres": { name: "Σέρρες", capital: "Σέρρες", capitalCoord: [23.55, 41.083333], region: "Κεντρικής Μακεδονίας", isIsland: false, aliases: [] },
  "sifnos": { name: "Σίφνος", capital: "Απολλωνία", capitalCoord: [24.702778, 36.970833], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "sikinos": { name: "Σίκινος", capital: "Χώρα Σικίνου", capitalCoord: [25.1082, 36.6715], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "skiathos": { name: "Σκιάθος", capital: "Σκιάθος", capitalCoord: [23.45788, 39.1677], region: "Θεσσαλίας", isIsland: true, aliases: [] },
  "skopelos": { name: "Σκόπελος", capital: "Σκόπελος", capitalCoord: [23.69077, 39.12891], region: "Θεσσαλίας", isIsland: true, aliases: [] },
  "skyros": { name: "Σκύρος", capital: "Σκύρος", capitalCoord: [24.54984, 38.86251], region: "Στερεάς Ελλάδας", isIsland: true, aliases: [] },
  "spetses": { name: "Σπέτσες", capital: "Σπέτσες", capitalCoord: [23.159444, 37.261944], region: "Αττικής", isIsland: true, aliases: [] },
  "symi": { name: "Σύμη", capital: "Σύμη", capitalCoord: [27.837719, 36.613869], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "syros": { name: "Σύρος", capital: "Ερμούπολη", capitalCoord: [24.9381, 37.4395], region: "Νοτίου Αιγαίου", isIsland: true, aliases: ["ερμουπολη"] },
  "thasos": { name: "Θάσος", capital: "Λιμένας Θάσου", capitalCoord: [24.709444, 40.778056], region: "Ανατολικής Μακεδονίας και Θράκης", isIsland: true, aliases: [] },
  "thesprotia": { name: "Θεσπρωτία", capital: "Ηγουμενίτσα", capitalCoord: [20.263611, 39.500278], region: "Ηπείρου", isIsland: false, aliases: [] },
  "thessaloniki": { name: "Θεσσαλονίκη", capital: "Θεσσαλονίκη", capitalCoord: [22.935556, 40.640278], region: "Κεντρικής Μακεδονίας", isIsland: false, aliases: [] },
  "thira": { name: "Σαντορίνη", capital: "Φηρά", capitalCoord: [25.431667, 36.42], region: "Νοτίου Αιγαίου", isIsland: true, aliases: ["θηρα"] },
  "tinos": { name: "Τήνος", capital: "Τήνος", capitalCoord: [25.134, 37.6013], region: "Νοτίου Αιγαίου", isIsland: true, aliases: [] },
  "trikala": { name: "Τρίκαλα", capital: "Τρίκαλα", capitalCoord: [21.7675, 39.5548], region: "Θεσσαλίας", isIsland: false, aliases: [] },
  "viotia": { name: "Βοιωτία", capital: "Λιβαδειά", capitalCoord: [22.875, 38.436111], region: "Στερεάς Ελλάδας", isIsland: false, aliases: [] },
  "xanthi": { name: "Ξάνθη", capital: "Ξάνθη", capitalCoord: [24.883333, 41.133333], region: "Ανατολικής Μακεδονίας και Θράκης", isIsland: false, aliases: [] },
  "zakynthos": { name: "Ζάκυνθος", capital: "Ζάκυνθος", capitalCoord: [20.75, 37.8], region: "Ιονίων Νήσων", isIsland: true, aliases: ["ζακυνθοσ"] },
};
