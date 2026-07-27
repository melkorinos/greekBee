// Λογοπαίγνιο — the seed candidate list (handoff logopaignio-content-pool.md).
//
// One row per candidate brand. This file is DATA ONLY: no fetching, no cropping.
// The fetcher (scripts/fetch-logopaignio-logos.mjs) resolves each row's asset via
// the Wikimedia Commons API, and the preview generator renders them for the human
// eye check. Nothing here ships to the app — a brand only becomes a puzzle after
// the operator approves it and it is written into src/data/logopaignio/puzzles-el.json.
//
// FIELDS
//   id        stable slug — also the raw filename stem and the future puzzle id
//   brand     canonical display name (what the player must guess)
//   sector    Greek sector label, shown in-game as the permanent free hint
//   accept    draft accept-list — Greek form + Latin form + common variants.
//             MUST bridge the Greek⇄Latin fork; the operator extends it on approval.
//   search    Commons search terms, tried in order until a file is found.
//             null = no expected public asset (manual sourcing case).
//   note      guidance for the eye check (why it might fail the icon-only filter)
//
// RULES (see the handoff):
//   • current logo only  • master/parent brand only  • defunct/nostalgia marks
//   allowed  • pure wordmarks are REJECTED (the icon-only filter) — they are
//   unguessable once name-stripped.
//
// SCOPE CHANGE (operator decision, 2026-07-27): the "founded/HQ'd in Greece" half
// of the Greek-origin rule is DROPPED. The pool is now "brands a Greek audience
// recognizes", regardless of origin — so DHL, Revolut, Sprite, Fanta, Pepsi,
// Wolt, Groupama et al. are in scope. Recognizability to a Greek audience is
// still required; this widens the pool toward the 150 launch floor without
// touching the icon-only filter, which is what actually keeps the game playable.
//
// CATEGORY MERGES (same decision): «Ταχυδρομείο» folded into «Delivery», and
// «Μεταφορές» folded into «Ακτοπλοΐα» as one unified «Μεταφορές» transport
// sector. Sector strings here are the in-game free hint, so fewer, fatter
// categories give less of a giveaway than many thin ones.

/**
 * @typedef {Object} SeedBrand
 * @property {string} id
 * @property {string} brand
 * @property {string} sector
 * @property {string[]} accept
 * @property {string[]|null} search
 * @property {string} [note]
 */

/** @type {SeedBrand[]} */
export const SEED_BRANDS = [
  // ─── Τράπεζες / χρηματοοικονομικά ────────────────────────────────────────
  {
    id: "alpha-bank",
    brand: "Alpha Bank",
    sector: "Τράπεζα",
    accept: ["Alpha Bank", "Άλφα Μπανκ", "Alpha", "Άλφα", "Αλφα Μπανκ"],
    search: ["Alpha Bank logo"],
    note: "PoC ✅ keep — navy square + white A is a clean standalone mark.",
  },
  {
    id: "ethniki-trapeza",
    brand: "Εθνική Τράπεζα",
    sector: "Τράπεζα",
    accept: [
      "Εθνική Τράπεζα",
      "Εθνικη Τραπεζα",
      "Εθνική",
      "ΕΤΕ",
      "National Bank of Greece",
      "NBG",
    ],
    search: ["National Bank of Greece logo", "Εθνική Τράπεζα logo"],
    note: "Fire-horse/flame emblem — check it separates from the wordmark.",
  },
  {
    id: "peiraios",
    brand: "Τράπεζα Πειραιώς",
    sector: "Τράπεζα",
    accept: [
      "Τράπεζα Πειραιώς",
      "Τραπεζα Πειραιως",
      "Πειραιώς",
      "Πειραιως",
      "Piraeus Bank",
      "Piraeus",
    ],
    search: ["Piraeus Bank logo", "Piraeus Financial Holdings logo"],
  },
  {
    id: "eurobank",
    brand: "Eurobank",
    sector: "Τράπεζα",
    accept: ["Eurobank", "Γιούρομπανκ", "Ευρωμπανκ", "Γιουρομπανκ"],
    search: ["Eurobank logo", "Eurobank Ergasias logo"],
  },
  {
    id: "optima-bank",
    brand: "Optima Bank",
    sector: "Τράπεζα",
    accept: ["Optima Bank", "Optima", "Όπτιμα", "Οπτιμα"],
    search: ["Optima Bank logo"],
  },
  {
    id: "attica-bank",
    brand: "Attica Bank",
    sector: "Τράπεζα",
    accept: ["Attica Bank", "Αττικής", "Τράπεζα Αττικής", "Attica"],
    search: ["Attica Bank logo"],
  },
  {
    id: "interamerican",
    brand: "Interamerican",
    sector: "Ασφάλειες",
    accept: ["Interamerican", "Ίντεραμέρικαν", "Ιντεραμερικαν"],
    search: ["Interamerican logo"],
  },
  {
    id: "ethniki-asfalistiki",
    brand: "Εθνική Ασφαλιστική",
    sector: "Ασφάλειες",
    accept: ["Εθνική Ασφαλιστική", "Εθνικη Ασφαλιστικη", "Ethniki Asfalistiki"],
    search: ["Ethniki Asfalistiki logo", "Εθνική Ασφαλιστική logo"],
  },

  // ─── Σούπερ μάρκετ ───────────────────────────────────────────────────────
  {
    id: "ab-vassilopoulos",
    brand: "ΑΒ Βασιλόπουλος",
    sector: "Σούπερ μάρκετ",
    accept: [
      "ΑΒ Βασιλόπουλος",
      "ΑΒ Βασιλοπουλος",
      "Βασιλόπουλος",
      "Βασιλοπουλος",
      "ΑΒ",
      "AB Vassilopoulos",
      "AB",
    ],
    search: ["Alfa-Beta Vassilopoulos logo", "AB Vassilopoulos logo"],
    note: "The «ΑΒ» monogram tile is the mark.",
  },
  {
    id: "sklavenitis",
    brand: "Σκλαβενίτης",
    sector: "Σούπερ μάρκετ",
    accept: ["Σκλαβενίτης", "Σκλαβενιτης", "Sklavenitis"],
    search: ["Sklavenitis logo"],
  },
  {
    id: "masoutis",
    brand: "Μασούτης",
    sector: "Σούπερ μάρκετ",
    accept: ["Μασούτης", "Μασουτης", "Masoutis"],
    search: ["Masoutis logo"],
  },
  {
    id: "my-market",
    brand: "My Market",
    sector: "Σούπερ μάρκετ",
    accept: ["My Market", "Μάι Μάρκετ", "Μαι Μαρκετ", "MyMarket", "Metro"],
    search: ["My Market logo", "Metro AEBE logo"],
  },
  {
    id: "galaxias",
    brand: "Γαλαξίας",
    sector: "Σούπερ μάρκετ",
    accept: ["Γαλαξίας", "Γαλαξιας", "Galaxias"],
    search: ["Galaxias supermarket logo"],
  },
  {
    id: "kritikos",
    brand: "Κρητικός",
    sector: "Σούπερ μάρκετ",
    accept: ["Κρητικός", "Κρητικος", "Kritikos"],
    search: ["Kritikos supermarket logo"],
  },
  {
    id: "bazaar",
    brand: "Bazaar",
    sector: "Σούπερ μάρκετ",
    accept: ["Bazaar", "Μπαζάαρ", "Μπαζααρ"],
    search: ["Bazaar supermarket logo"],
  },
  {
    id: "lidl-hellas",
    brand: "Lidl",
    sector: "Σούπερ μάρκετ",
    accept: ["Lidl", "Λιντλ", "Λίντλ"],
    search: ["Lidl logo"],
    note: "FOREIGN — German. Likely reject per the Greek-scope rule; kept only for the eye check.",
  },

  // ─── Αεροπορικές / ακτοπλοΐα ─────────────────────────────────────────────
  {
    id: "aegean",
    brand: "Aegean Airlines",
    sector: "Αεροπορική εταιρεία",
    accept: ["Aegean", "Aegean Airlines", "Έιτζιαν", "Ειτζιαν", "Αιγαίον", "Αιγαιον"],
    search: ["Aegean Airlines logo"],
    note: "PoC ✅ keep — 2020 motif is thin; prefer a tail-livery mark if a better asset appears.",
  },
  {
    id: "olympic-airways",
    brand: "Olympic Airways",
    sector: "Αεροπορική εταιρεία",
    accept: [
      "Olympic Airways",
      "Ολυμπιακή",
      "Ολυμπιακη",
      "Ολυμπιακή Αεροπορία",
      "Olympic",
      "Olympic Air",
    ],
    search: ["Olympic Airways logo", "Olympic Air logo"],
    note: "DEFUNCT/nostalgia — the six meander rings are one of the strongest Greek marks.",
  },
  {
    id: "sky-express",
    brand: "Sky Express",
    sector: "Αεροπορική εταιρεία",
    accept: ["Sky Express", "Σκάι Εξπρές", "Σκαι Εξπρες", "SkyExpress"],
    search: ["Sky Express logo"],
  },
  {
    id: "blue-star-ferries",
    brand: "Blue Star Ferries",
    sector: "Μεταφορές",
    accept: ["Blue Star Ferries", "Blue Star", "Μπλε Σταρ", "Μπλου Σταρ"],
    search: ["Blue Star Ferries logo"],
    note: "The star is the separable mark.",
  },
  {
    id: "superfast-ferries",
    brand: "Superfast Ferries",
    sector: "Μεταφορές",
    accept: ["Superfast Ferries", "Superfast", "Σούπερφαστ", "Σουπερφαστ"],
    search: ["Superfast Ferries logo"],
  },
  {
    id: "anek-lines",
    brand: "ANEK Lines",
    sector: "Μεταφορές",
    accept: ["ANEK", "ANEK Lines", "ΑΝΕΚ", "Άνεκ", "Ανεκ"],
    search: ["ANEK Lines logo"],
  },
  {
    id: "minoan-lines",
    brand: "Minoan Lines",
    sector: "Μεταφορές",
    accept: ["Minoan Lines", "Minoan", "Μινωικές Γραμμές", "Μινωικες Γραμμες", "Μινωικές"],
    search: ["Minoan Lines logo"],
  },
  {
    id: "attica-group",
    brand: "Attica Group",
    sector: "Μεταφορές",
    accept: ["Attica Group", "Αττικα Γκρουπ", "Αττική Γκρουπ"],
    search: ["Attica Group logo"],
  },
  {
    id: "seajets",
    brand: "SeaJets",
    sector: "Μεταφορές",
    accept: ["SeaJets", "Sea Jets", "Σίτζετς", "Σιτζετς"],
    search: ["SeaJets logo"],
  },
  {
    id: "hellenic-seaways",
    brand: "Hellenic Seaways",
    sector: "Μεταφορές",
    accept: ["Hellenic Seaways", "Χέλενικ Σίγουεης", "Ελληνικές Γραμμές"],
    search: ["Hellenic Seaways logo"],
  },

  // ─── Τηλεπικοινωνίες / ίντερνετ ──────────────────────────────────────────
  {
    id: "ote",
    brand: "ΟΤΕ",
    sector: "Τηλεπικοινωνίες",
    accept: ["ΟΤΕ", "OTE", "Οτε", "Οργανισμός Τηλεπικοινωνιών Ελλάδος"],
    search: ["OTE logo", "Hellenic Telecommunications Organization logo"],
    note: "Prefer a RETIRED OTE mark — the current one is Deutsche Telekom's T (same trap as Cosmote).",
  },
  {
    id: "nova",
    brand: "Nova",
    sector: "Τηλεπικοινωνίες",
    accept: ["Nova", "Νόβα", "Νοβα"],
    search: ["Nova Greece logo", "Forthnet logo"],
  },
  {
    id: "wind-hellas",
    brand: "WIND",
    sector: "Τηλεπικοινωνίες",
    accept: ["WIND", "Wind", "Γουίντ", "Γουιντ", "Wind Hellas"],
    search: ["Wind Hellas logo"],
    note: "DEFUNCT (merged into Nova) — nostalgia mark.",
  },
  {
    id: "forthnet",
    brand: "Forthnet",
    sector: "Τηλεπικοινωνίες",
    accept: ["Forthnet", "Φόρθνετ", "Φορθνετ"],
    search: ["Forthnet logo"],
    note: "DEFUNCT/merged.",
  },

  // ─── Ενέργεια / καύσιμα ──────────────────────────────────────────────────
  {
    id: "dei",
    brand: "ΔΕΗ",
    sector: "Ενέργεια",
    accept: ["ΔΕΗ", "Δεη", "DEI", "PPC", "Δημόσια Επιχείρηση Ηλεκτρισμού"],
    search: ["Public Power Corporation logo", "DEI logo"],
    note: "The blue/white swirl is highly recognizable.",
  },
  {
    id: "eko",
    brand: "ΕΚΟ",
    sector: "Καύσιμα",
    accept: ["ΕΚΟ", "EKO", "Εκο"],
    search: ["EKO fuel logo", "EKO Hellenic Petroleum logo"],
    note: "Flame mark.",
  },
  {
    id: "helleniq-energy",
    brand: "HelleniQ Energy",
    sector: "Ενέργεια",
    accept: [
      "HelleniQ Energy",
      "HelleniQ",
      "ΕΛΠΕ",
      "Ελληνικά Πετρέλαια",
      "Ελληνικα Πετρελαια",
      "Χελένικ Ενέρτζι",
    ],
    search: ["HelleniQ Energy logo", "Hellenic Petroleum logo"],
    note: "PoC ✅ keep — pinwheel crops perfectly. Accept-list MUST cover the old ΕΛΠΕ name.",
  },
  {
    id: "coral",
    brand: "Coral",
    sector: "Καύσιμα",
    accept: ["Coral", "Κόραλ", "Κοραλ"],
    search: ["Coral Gas logo", "Coral AE logo"],
  },
  {
    id: "avin",
    brand: "Avin",
    sector: "Καύσιμα",
    accept: ["Avin", "Άβιν", "Αβιν"],
    search: ["Avin Oil logo"],
  },
  {
    id: "jetoil",
    brand: "Jetoil",
    sector: "Καύσιμα",
    accept: ["Jetoil", "Τζέτοϊλ", "Τζετοιλ"],
    search: ["Jetoil logo"],
    note: "DEFUNCT — nostalgia mark.",
  },
  {
    id: "aegean-oil",
    brand: "Aegean Oil",
    sector: "Καύσιμα",
    accept: ["Aegean Oil", "Έιτζιαν Όιλ", "Αιγαίον Όιλ"],
    search: ["Aegean Oil logo"],
  },
  {
    id: "depa",
    brand: "ΔΕΠΑ",
    sector: "Ενέργεια",
    accept: ["ΔΕΠΑ", "DEPA", "Δεπα", "Δημόσια Επιχείρηση Αερίου"],
    search: ["DEPA logo"],
  },

  // ─── Τρόφιμα / ποτά / γαλακτοκομικά ──────────────────────────────────────
  {
    id: "delta",
    brand: "ΔΕΛΤΑ",
    sector: "Γαλακτοκομικά",
    accept: ["ΔΕΛΤΑ", "Δέλτα", "Δελτα", "Delta"],
    search: ["Delta Foods logo", "Delta dairy logo"],
  },
  {
    id: "nounou",
    brand: "ΝΟΥΝΟΥ",
    sector: "Γαλακτοκομικά",
    accept: ["ΝΟΥΝΟΥ", "Νουνού", "Νουνου", "Nounou", "NOYNOY"],
    search: ["Nounou milk logo", "NOYNOY logo"],
    note: "Mascot mark — strong candidate if the bear/child figure separates.",
  },
  {
    id: "mevgal",
    brand: "Μέβγαλ",
    sector: "Γαλακτοκομικά",
    accept: ["Μέβγαλ", "Μεβγαλ", "Mevgal"],
    search: ["Mevgal logo"],
  },
  {
    id: "olympos",
    brand: "Όλυμπος",
    sector: "Γαλακτοκομικά",
    accept: ["Όλυμπος", "Ολυμπος", "Olympos"],
    search: ["Olympos dairy logo"],
  },
  {
    id: "fage",
    brand: "ΦΑΓΕ",
    sector: "Γαλακτοκομικά",
    accept: ["ΦΑΓΕ", "Φάγε", "Φαγε", "FAGE"],
    search: ["FAGE logo"],
  },
  {
    id: "vikos",
    brand: "Βίκος",
    sector: "Αναψυκτικά",
    accept: ["Βίκος", "Βικος", "Vikos"],
    search: ["Vikos water logo", "Vikos SA logo"],
  },
  {
    id: "loux",
    brand: "Λουξ",
    sector: "Αναψυκτικά",
    accept: ["Λουξ", "Loux"],
    search: ["Loux logo"],
  },
  {
    id: "epsa",
    brand: "ΕΨΑ",
    sector: "Αναψυκτικά",
    accept: ["ΕΨΑ", "Έψα", "Εψα", "EPSA"],
    search: ["EPSA logo"],
  },
  {
    id: "ivi",
    brand: "Ήβη",
    sector: "Αναψυκτικά",
    accept: ["Ήβη", "Ηβη", "IVI", "Ivi"],
    search: ["Ivi soft drink logo"],
  },
  {
    id: "chipita",
    brand: "Chipita",
    sector: "Τρόφιμα",
    accept: ["Chipita", "Τσιπίτα", "Τσιπιτα", "7Days", "Molto"],
    search: ["Chipita logo", "7Days Chipita logo"],
  },
  {
    id: "papadopoulou",
    brand: "Παπαδοπούλου",
    sector: "Τρόφιμα",
    accept: [
      "Παπαδοπούλου",
      "Παπαδοπουλου",
      "Παπαδόπουλος",
      "Papadopoulou",
      "Ε.Ι. Παπαδοπούλου",
    ],
    search: ["Papadopoulou biscuits logo", "E.I. Papadopoulos logo"],
  },
  {
    id: "ion",
    brand: "ΙΟΝ",
    sector: "Τρόφιμα",
    accept: ["ΙΟΝ", "Ίον", "Ιον", "ION"],
    search: ["ION chocolate logo"],
  },
  {
    id: "misko",
    brand: "Misko",
    sector: "Τρόφιμα",
    accept: ["Misko", "Μίσκο", "Μισκο"],
    search: ["Misko pasta logo"],
  },
  {
    id: "melissa",
    brand: "Μέλισσα",
    sector: "Τρόφιμα",
    accept: ["Μέλισσα", "Μελισσα", "Melissa", "Μέλισσα Κίκιζας"],
    search: ["Melissa Kikizas logo"],
    note: "A bee mark would be ideal for the icon-only filter.",
  },
  {
    id: "barba-stathis",
    brand: "Μπάρμπα Στάθης",
    sector: "Τρόφιμα",
    accept: [
      "Μπάρμπα Στάθης",
      "Μπαρμπα Σταθης",
      "Barba Stathis",
      "Μπαρμπαστάθης",
    ],
    search: ["Barba Stathis logo"],
    note: "Mascot (the old man) — strong icon candidate.",
  },
  {
    id: "kri-kri",
    brand: "Κρι Κρι",
    sector: "Γαλακτοκομικά",
    accept: ["Κρι Κρι", "Κρι-Κρι", "Kri Kri", "Kri-Kri"],
    search: ["Kri Kri logo"],
  },
  {
    id: "3e",
    brand: "3Ε",
    sector: "Αναψυκτικά",
    accept: ["3Ε", "3E", "Coca-Cola 3E", "Coca-Cola HBC"],
    search: ["Coca-Cola HBC logo"],
    note: "Likely REJECT — reads as Coca-Cola (foreign master brand).",
  },

  // ─── Εστίαση / καφέ ──────────────────────────────────────────────────────
  {
    id: "goodys",
    brand: "Goody's",
    sector: "Εστίαση",
    accept: ["Goody's", "Goodys", "Γκούντις", "Γκουντις", "Goody s"],
    search: ["Goody's logo"],
    note: "Foreign-owned but perceived Greek — allowed by the rules.",
  },
  {
    id: "everest",
    brand: "Everest",
    sector: "Εστίαση",
    accept: ["Everest", "Έβερεστ", "Εβερεστ"],
    search: ["Everest Greece logo", "Everest snack logo"],
  },
  {
    id: "grigoris",
    brand: "Γρηγόρης",
    sector: "Εστίαση",
    accept: ["Γρηγόρης", "Γρηγορης", "Grigoris", "Γρηγόρης Μικρογεύματα"],
    search: ["Grigoris Mikrogevmata logo"],
  },
  {
    id: "coffee-island",
    brand: "Coffee Island",
    sector: "Καφέ",
    accept: ["Coffee Island", "Κόφι Άιλαντ", "Κοφι Αιλαντ"],
    search: ["Coffee Island logo"],
  },
  {
    id: "mikel",
    brand: "Mikel",
    sector: "Καφέ",
    accept: ["Mikel", "Μάικελ", "Μαικελ", "Mikel Coffee"],
    search: ["Mikel Coffee Company logo"],
  },
  {
    id: "flocafe",
    brand: "Flocafe",
    sector: "Καφέ",
    accept: ["Flocafe", "Φλοκαφέ", "Φλοκαφε"],
    search: ["Flocafe logo"],
  },

  // ─── Λιανική / ηλεκτρονικά ───────────────────────────────────────────────
  {
    id: "public",
    brand: "Public",
    sector: "Λιανική",
    accept: ["Public", "Πάμπλικ", "Παμπλικ"],
    search: null,
    note: "PoC ○ manual — no clean public SVG; source from public.gr by hand.",
  },
  {
    id: "kotsovolos",
    brand: "Κωτσόβολος",
    sector: "Ηλεκτρονικά",
    accept: ["Κωτσόβολος", "Κωτσοβολος", "Kotsovolos"],
    search: ["Kotsovolos logo"],
  },
  {
    id: "plaisio",
    brand: "Πλαίσιο",
    sector: "Ηλεκτρονικά",
    accept: ["Πλαίσιο", "Πλαισιο", "Plaisio"],
    search: ["Plaisio logo"],
  },
  {
    id: "jumbo",
    brand: "Jumbo",
    sector: "Λιανική",
    accept: ["Jumbo", "Τζάμπο", "Τζαμπο"],
    search: ["Jumbo SA logo"],
    note: "Likely wordmark-only — verify.",
  },
  {
    id: "hondos-center",
    brand: "Hondos Center",
    sector: "Λιανική",
    accept: ["Hondos Center", "Χονδρός", "Χόντος", "Χοντος Σεντερ"],
    search: ["Hondos Center logo"],
  },
  {
    id: "praktiker",
    brand: "Praktiker",
    sector: "Λιανική",
    accept: ["Praktiker", "Πρακτίκερ", "Πρακτικερ"],
    search: ["Praktiker logo"],
  },
  {
    id: "notos-galleries",
    brand: "Notos Galleries",
    sector: "Λιανική",
    accept: ["Notos Galleries", "Νότος", "Νοτος", "Notos"],
    search: ["Notos Galleries logo"],
  },

  // ─── Online / delivery ───────────────────────────────────────────────────
  {
    id: "skroutz",
    brand: "Skroutz",
    sector: "Ηλεκτρονικό εμπόριο",
    accept: ["Skroutz", "Σκρουτζ", "Σκρούτζ"],
    search: ["Skroutz logo"],
    note: "The shopping-bag mark is a clean icon.",
  },
  {
    id: "efood",
    brand: "efood",
    sector: "Delivery",
    accept: ["efood", "e-food", "Ίφουντ", "Ιφουντ", "e food"],
    search: ["efood logo", "e-food logo"],
  },
  {
    id: "box",
    brand: "BOX",
    sector: "Delivery",
    accept: ["BOX", "Box", "Μποξ", "Μπόξ"],
    search: ["BOX delivery Greece logo"],
  },
  {
    id: "car-gr",
    brand: "Car.gr",
    sector: "Ηλεκτρονικό εμπόριο",
    accept: ["Car.gr", "Car gr", "Κάρ", "Cargr"],
    search: ["Car.gr logo"],
  },
  {
    id: "spitogatos",
    brand: "Spitogatos",
    sector: "Ηλεκτρονικό εμπόριο",
    accept: ["Spitogatos", "Σπιτόγατος", "Σπιτογατος"],
    search: ["Spitogatos logo"],
    note: "A cat mark would be a perfect icon — verify.",
  },
  {
    id: "xe-gr",
    brand: "XE.gr",
    sector: "Ηλεκτρονικό εμπόριο",
    accept: ["XE.gr", "XE", "Χρυσή Ευκαιρία", "Χρυση Ευκαιρια", "Xe gr"],
    search: ["XE.gr logo", "Chrysi Efkairia logo"],
  },

  // ─── Στοίχημα / λαχεία ───────────────────────────────────────────────────
  {
    id: "opap",
    brand: "ΟΠΑΠ",
    sector: "Τυχερά παιχνίδια",
    accept: ["ΟΠΑΠ", "OPAP", "Οπαπ"],
    search: ["OPAP logo"],
  },
  {
    id: "stoiximan",
    brand: "Stoiximan",
    sector: "Τυχερά παιχνίδια",
    accept: ["Stoiximan", "Στοίχημαν", "Στοιχηματάν", "Στοιχειμαν"],
    search: ["Stoiximan logo"],
  },
  {
    id: "novibet",
    brand: "Novibet",
    sector: "Τυχερά παιχνίδια",
    accept: ["Novibet", "Νόβιμπετ", "Νοβιμπετ"],
    search: ["Novibet logo"],
  },

  // ─── Καλλυντικά / φαρμακευτικά ───────────────────────────────────────────
  {
    id: "korres",
    brand: "Korres",
    sector: "Καλλυντικά",
    accept: ["Korres", "Κορρές", "Κορρες"],
    search: ["Korres logo"],
  },
  {
    id: "apivita",
    brand: "Apivita",
    sector: "Καλλυντικά",
    accept: ["Apivita", "Απιβίτα", "Απιβιτα"],
    search: ["Apivita logo"],
    note: "Bee/hive mark — good icon candidate.",
  },
  {
    id: "frezyderm",
    brand: "Frezyderm",
    sector: "Καλλυντικά",
    accept: ["Frezyderm", "Φρεζιντέρμ", "Φρεζιντερμ"],
    search: ["Frezyderm logo"],
  },
  {
    id: "sarantis",
    brand: "Σαράντης",
    sector: "Καλλυντικά",
    accept: ["Σαράντης", "Σαραντης", "Sarantis", "Γρ. Σαράντης"],
    search: ["Sarantis Group logo"],
  },
  {
    id: "papoutsanis",
    brand: "Παπουτσάνης",
    sector: "Καλλυντικά",
    accept: ["Παπουτσάνης", "Παπουτσανης", "Papoutsanis"],
    search: ["Papoutsanis logo"],
  },
  {
    id: "lanes",
    brand: "Lanes",
    sector: "Φαρμακευτικά",
    accept: ["Lanes", "Λάνες", "Λανες"],
    search: ["Lanes Greece logo"],
  },

  // ─── Βιομηχανία / κατασκευές ─────────────────────────────────────────────
  {
    id: "titan",
    brand: "ΤΙΤΑΝ",
    sector: "Βιομηχανία",
    accept: ["ΤΙΤΑΝ", "Τιτάν", "Τιταν", "Titan", "Titan Cement"],
    search: ["Titan Cement logo"],
  },
  {
    id: "metlen",
    brand: "Metlen",
    sector: "Βιομηχανία",
    accept: [
      "Metlen",
      "Μέτλεν",
      "Μετλεν",
      "Μυτιληναίος",
      "Μυτιληναιος",
      "Mytilineos",
    ],
    search: ["Metlen Energy Metals logo", "Mytilineos logo"],
  },
  {
    id: "gek-terna",
    brand: "ΓΕΚ ΤΕΡΝΑ",
    sector: "Κατασκευές",
    accept: ["ΓΕΚ ΤΕΡΝΑ", "ΓΕΚ", "ΤΕΡΝΑ", "Τέρνα", "Τερνα", "GEK TERNA", "Terna"],
    search: ["GEK Terna logo", "Terna logo"],
  },
  {
    id: "aktor",
    brand: "Aktor",
    sector: "Κατασκευές",
    accept: ["Aktor", "Άκτωρ", "Ακτωρ", "Ελλάκτωρ", "Ellaktor"],
    search: ["Aktor logo", "Ellaktor logo"],
  },
  {
    id: "alumil",
    brand: "Alumil",
    sector: "Βιομηχανία",
    accept: ["Alumil", "Αλουμίλ", "Αλουμιλ"],
    search: ["Alumil logo"],
  },
  {
    id: "elval",
    brand: "ΕΛΒΑΛ",
    sector: "Βιομηχανία",
    accept: ["ΕΛΒΑΛ", "Έλβαλ", "Ελβαλ", "Elval", "ElvalHalcor"],
    search: ["Elval logo", "ElvalHalcor logo"],
  },
  {
    id: "viohalco",
    brand: "Viohalco",
    sector: "Βιομηχανία",
    accept: ["Viohalco", "Βιοχάλκο", "Βιοχαλκο"],
    search: ["Viohalco logo"],
  },

  // ─── Υπηρεσίες κοινής ωφέλειας / μεταφορές ───────────────────────────────
  {
    id: "eydap",
    brand: "ΕΥΔΑΠ",
    sector: "Ύδρευση",
    accept: ["ΕΥΔΑΠ", "EYDAP", "Ευδαπ"],
    search: ["EYDAP logo"],
  },
  {
    id: "eyath",
    brand: "ΕΥΑΘ",
    sector: "Ύδρευση",
    accept: ["ΕΥΑΘ", "EYATH", "Ευαθ"],
    search: ["EYATH logo"],
  },
  {
    id: "hellenic-train",
    brand: "Hellenic Train",
    sector: "Μεταφορές",
    accept: [
      "Hellenic Train",
      "ΟΣΕ",
      "OSE",
      "ΤΡΑΙΝΟΣΕ",
      "TrainOSE",
      "Τραινοσέ",
    ],
    search: ["Hellenic Train logo", "TrainOSE logo", "OSE logo"],
  },
  {
    id: "stasy",
    brand: "ΣΤΑΣΥ",
    sector: "Μεταφορές",
    accept: ["ΣΤΑΣΥ", "STASY", "Στασυ", "Σταθερές Συγκοινωνίες"],
    search: ["STASY logo", "Athens Metro logo"],
  },
  {
    id: "oasa",
    brand: "ΟΑΣΑ",
    sector: "Μεταφορές",
    accept: ["ΟΑΣΑ", "OASA", "Οασα"],
    search: ["OASA logo"],
  },
  {
    id: "elta",
    brand: "ΕΛΤΑ",
    sector: "Delivery",
    accept: ["ΕΛΤΑ", "ELTA", "Ελτα", "Ελληνικά Ταχυδρομεία"],
    search: ["Hellenic Post logo", "ELTA logo"],
  },
  {
    id: "acs",
    brand: "ACS",
    sector: "Delivery",
    accept: ["ACS", "Έι Σι Ες", "Ειcιες"],
    search: ["ACS Courier logo"],
  },
  {
    id: "geniki-taxydromiki",
    brand: "Γενική Ταχυδρομική",
    sector: "Delivery",
    accept: ["Γενική Ταχυδρομική", "Γενικη Ταχυδρομικη", "Geniki Taxydromiki"],
    search: ["Geniki Taxydromiki logo"],
  },

  // ─── ΜΜΕ / ψυχαγωγία ─────────────────────────────────────────────────────
  {
    id: "ert",
    brand: "ΕΡΤ",
    sector: "Μέσα ενημέρωσης",
    accept: ["ΕΡΤ", "ERT", "Ερτ", "Ελληνική Ραδιοφωνία Τηλεόραση"],
    search: ["ERT logo"],
  },
  {
    id: "mega-channel",
    brand: "MEGA",
    sector: "Μέσα ενημέρωσης",
    accept: ["MEGA", "Μέγκα", "Μεγκα", "Mega Channel"],
    search: ["Mega Channel logo"],
  },
  {
    id: "ant1",
    brand: "ANT1",
    sector: "Μέσα ενημέρωσης",
    accept: ["ANT1", "ΑΝΤ1", "Άντεννα", "Αντεννα", "Antenna"],
    search: ["ANT1 logo", "Antenna TV logo"],
  },
  {
    id: "skai",
    brand: "ΣΚΑΪ",
    sector: "Μέσα ενημέρωσης",
    accept: ["ΣΚΑΪ", "ΣΚΑΙ", "Σκάι", "Σκαι", "SKAI"],
    search: ["Skai TV logo"],
  },
  {
    id: "star-channel",
    brand: "Star",
    sector: "Μέσα ενημέρωσης",
    accept: ["Star", "Σταρ", "Star Channel"],
    search: ["Star Channel logo"],
  },
  {
    id: "alpha-tv",
    brand: "Alpha TV",
    sector: "Μέσα ενημέρωσης",
    accept: ["Alpha TV", "Άλφα TV", "Alpha"],
    search: ["Alpha TV Greece logo"],
  },
  {
    id: "minos-emi",
    brand: "Minos EMI",
    sector: "Μουσική",
    accept: ["Minos EMI", "Μίνως", "Μινως", "Minos"],
    search: ["Minos EMI logo"],
  },
  {
    id: "public-cinemas",
    brand: "Village Cinemas",
    sector: "Ψυχαγωγία",
    accept: ["Village Cinemas", "Village", "Βίλατζ", "Βιλατζ"],
    search: ["Village Roadshow Greece logo", "Village Cinemas logo"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // EXPANSION — operator's additions, 2026-07-27.
  // Adds the sectors the first pass was thin in, plus the foreign brands the
  // dropped Greek-origin rule now allows. Sourcing only; no eye check yet.
  // ══════════════════════════════════════════════════════════════════════════

  // ─── Αναψυκτικά (expansion) ──────────────────────────────────────────────
  {
    id: "sprite",
    brand: "Sprite",
    sector: "Αναψυκτικά",
    accept: ["Sprite", "Σπράιτ", "Σπραιτ"],
    search: ["Sprite logo"],
  },
  {
    id: "fanta",
    brand: "Fanta",
    sector: "Αναψυκτικά",
    accept: ["Fanta", "Φάντα", "Φαντα"],
    search: ["Fanta logo"],
  },
  {
    id: "nestea",
    brand: "Nestea",
    sector: "Αναψυκτικά",
    accept: ["Nestea", "Νεστέα", "Νεστεα"],
    search: ["Nestea logo"],
  },
  {
    id: "lipton-ice-tea",
    brand: "Lipton Ice Tea",
    sector: "Αναψυκτικά",
    accept: ["Lipton Ice Tea", "Ice Tea", "Λίπτον", "Λιπτον", "Lipton"],
    search: ["Lipton Ice Tea logo", "Lipton logo"],
  },
  {
    id: "pepsi",
    brand: "Pepsi",
    sector: "Αναψυκτικά",
    accept: ["Pepsi", "Πέπσι", "Πεπσι"],
    search: ["Pepsi logo"],
    note: "The globe roundel is a textbook icon-only mark.",
  },
  {
    id: "three-cents",
    brand: "Three Cents",
    sector: "Αναψυκτικά",
    accept: ["Three Cents", "3 Cents", "Θρι Σεντς", "3cents"],
    search: ["Three Cents logo"],
  },
  {
    id: "amita",
    brand: "Amita",
    sector: "Αναψυκτικά",
    accept: ["Amita", "Αμίτα", "Αμιτα"],
    search: ["Amita logo", "Amita juice logo"],
  },

  // ─── Delivery / ταχυμεταφορές (expansion) ────────────────────────────────
  {
    id: "dhl",
    brand: "DHL",
    sector: "Delivery",
    accept: ["DHL", "Ντι Έιτς Ελ", "Ντιέιτσελ"],
    search: ["DHL logo"],
  },
  {
    id: "elta-courier",
    brand: "ΕΛΤΑ Courier",
    sector: "Delivery",
    accept: ["ΕΛΤΑ Courier", "ELTA Courier", "Ελτα Κούριερ", "ΕΛΤΑ Κούριερ"],
    search: ["ELTA Courier logo", "Hellenic Post courier logo"],
  },
  {
    id: "icc-courier",
    brand: "ICC Courier",
    sector: "Delivery",
    accept: ["ICC Courier", "ICC", "Άι Σι Σι"],
    search: ["ICC Courier logo"],
  },
  {
    id: "wolt",
    brand: "Wolt",
    sector: "Delivery",
    accept: ["Wolt", "Βολτ", "Γουόλτ", "Γουολτ"],
    search: ["Wolt logo"],
  },

  // ─── Καύσιμα (expansion) ─────────────────────────────────────────────────
  {
    id: "revoil",
    brand: "Revoil",
    sector: "Καύσιμα",
    accept: ["Revoil", "Ρεβόιλ", "Ρεβοιλ"],
    search: ["Revoil logo"],
  },
  {
    id: "silkoil",
    brand: "Silk Oil",
    sector: "Καύσιμα",
    accept: ["Silk Oil", "Silkoil", "Σιλκ Όιλ", "Σιλκοιλ"],
    search: ["Silk Oil logo", "Silkoil logo"],
  },
  {
    id: "eteka",
    brand: "ΕΤΕΚΑ",
    sector: "Καύσιμα",
    accept: ["ΕΤΕΚΑ", "ETEKA", "Ετεκα"],
    search: ["ETEKA logo"],
  },
  {
    id: "elin",
    brand: "ELIN",
    sector: "Καύσιμα",
    accept: ["ELIN", "ΕΛΙΝ", "Έλιν", "Ελιν", "Elinoil", "ΕΛΙΝΟΙΛ"],
    search: ["ELIN logo", "Elinoil logo"],
    note: "Same group as ΕΛΙΝΟΙΛ — accept both names.",
  },

  // ─── Κατασκευές (expansion) ──────────────────────────────────────────────
  {
    id: "pelargos",
    brand: "Πελαργός",
    sector: "Κατασκευές",
    accept: ["Πελαργός", "Πελαργος", "Pelargos", "Πελαργός Τεχνική"],
    search: ["Pelargos Techniki logo"],
  },

  // ─── Τράπεζα (expansion) ─────────────────────────────────────────────────
  {
    id: "revolut",
    brand: "Revolut",
    sector: "Τράπεζα",
    accept: ["Revolut", "Ρεβολούτ", "Ρεβολουτ"],
    search: ["Revolut logo"],
  },

  // ─── Μέσα ενημέρωσης (expansion) ─────────────────────────────────────────
  {
    id: "art-tv",
    brand: "ΑΡΤ",
    sector: "Μέσα ενημέρωσης",
    accept: ["ΑΡΤ", "ART", "Αρτ", "ART TV"],
    search: ["ART TV Greece logo"],
  },
  {
    id: "mad-tv",
    brand: "MAD TV",
    sector: "Μέσα ενημέρωσης",
    accept: ["MAD TV", "MAD", "Μαντ", "Μαντ Τι Βι"],
    search: ["MAD TV logo"],
  },
  {
    id: "vouli-tileorasi",
    brand: "Βουλή Τηλεόραση",
    sector: "Μέσα ενημέρωσης",
    accept: ["Βουλή Τηλεόραση", "Βουλη Τηλεοραση", "Βουλή", "Vouli TV"],
    search: ["Vouli Tileorasi logo", "Hellenic Parliament TV logo"],
  },
  {
    id: "novalife",
    brand: "Novalife",
    sector: "Μέσα ενημέρωσης",
    accept: ["Novalife", "Νόβαλαϊφ", "Νοβαλαιφ", "Nova Life"],
    search: ["Novalife logo"],
  },
  {
    id: "rise-tv",
    brand: "RISE TV",
    sector: "Μέσα ενημέρωσης",
    accept: ["RISE TV", "RISE", "Ράιζ", "Ραιζ"],
    search: ["Rise TV Greece logo"],
  },

  // ─── Βιομηχανία / τρόφιμα (expansion) ────────────────────────────────────
  {
    id: "athinaiki-zythopoiia",
    brand: "Αθηναϊκή Ζυθοποιία",
    sector: "Βιομηχανία",
    accept: [
      "Αθηναϊκή Ζυθοποιία",
      "Αθηναικη Ζυθοποιια",
      "Athenian Brewery",
      "Αθηναϊκή",
    ],
    search: ["Athenian Brewery logo", "Αθηναϊκή Ζυθοποιία logo"],
  },
  {
    id: "cosmos-aluminium",
    brand: "Cosmos Aluminium",
    sector: "Βιομηχανία",
    accept: ["Cosmos Aluminium", "Κόσμος Αλουμίνιο", "Cosmos"],
    search: ["Cosmos Aluminium logo"],
  },
  {
    id: "skag",
    brand: "SKAG",
    sector: "Βιομηχανία",
    accept: ["SKAG", "ΣΚΑΓ", "Σκαγ"],
    search: ["SKAG logo"],
  },
  {
    id: "allatini",
    brand: "Αλλατίνη",
    sector: "Τρόφιμα",
    accept: ["Αλλατίνη", "Αλλατινη", "Allatini"],
    search: ["Allatini logo"],
  },
  {
    id: "aluminion-ellados",
    brand: "Αλουμίνιον της Ελλάδος",
    sector: "Βιομηχανία",
    accept: [
      "Αλουμίνιον της Ελλάδος",
      "Αλουμινιον της Ελλαδος",
      "Aluminium of Greece",
      "Αλουμίνιον",
    ],
    search: ["Aluminium of Greece logo"],
  },
  {
    id: "vianex",
    brand: "ΒΙΑΝΕΞ",
    sector: "Φαρμακευτικά",
    accept: ["ΒΙΑΝΕΞ", "VIANEX", "Βιανεξ"],
    search: ["Vianex logo"],
  },
  {
    id: "evga",
    brand: "ΕΒΓΑ",
    sector: "Γαλακτοκομικά",
    accept: ["ΕΒΓΑ", "EVGA", "Εβγα"],
    search: ["EVGA logo", "ΕΒΓΑ logo"],
  },
  {
    id: "estia",
    brand: "ΕΣΤΙΑ",
    sector: "Βιομηχανία",
    accept: ["ΕΣΤΙΑ", "ESTIA", "Εστία", "Εστια"],
    search: ["Estia AE logo"],
  },
  {
    id: "etem",
    brand: "ΕΤΕΜ",
    sector: "Βιομηχανία",
    accept: ["ΕΤΕΜ", "ETEM", "Ετεμ"],
    search: ["ETEM logo"],
  },
  {
    id: "iraklis",
    brand: "Ηρακλής",
    sector: "Βιομηχανία",
    accept: ["Ηρακλής", "Ηρακλης", "Iraklis", "ΑΓΕΤ Ηρακλής", "Heracles"],
    search: ["AGET Heracles logo", "Heracles General Cement logo"],
  },
  {
    id: "kyknos",
    brand: "ΚΥΚΝΟΣ",
    sector: "Τρόφιμα",
    accept: ["ΚΥΚΝΟΣ", "Κύκνος", "Κυκνος", "Kyknos"],
    search: ["Kyknos logo"],
    note: "A swan mark would be a strong icon — verify.",
  },
  {
    id: "naupigeia-elefsinas",
    brand: "Ναυπηγεία Ελευσίνας",
    sector: "Βιομηχανία",
    accept: [
      "Ναυπηγεία Ελευσίνας",
      "Ναυπηγεια Ελευσινας",
      "Elefsis Shipyards",
      "Ναυπηγεία",
    ],
    search: ["Elefsis Shipyards logo"],
  },
  {
    id: "pitsos",
    brand: "Πίτσος",
    sector: "Βιομηχανία",
    accept: ["Πίτσος", "Πιτσος", "Pitsos"],
    search: ["Pitsos logo"],
  },
  {
    id: "chalyvourgia",
    brand: "Χαλυβουργία Ελλάδος",
    sector: "Βιομηχανία",
    accept: [
      "Χαλυβουργία Ελλάδος",
      "Χαλυβουργια Ελλαδος",
      "Χαλυβουργία",
      "Hellenic Halyvourgia",
    ],
    search: ["Halyvourgia Ellados logo"],
  },

  // ─── Μεταφορές / ακτοπλοΐα (expansion) ───────────────────────────────────
  {
    id: "levante-ferries",
    brand: "Levante Ferries",
    sector: "Μεταφορές",
    accept: ["Levante Ferries", "Levante", "Λεβάντε", "Λεβαντε"],
    search: ["Levante Ferries logo"],
  },
  {
    id: "golden-star-ferries",
    brand: "Golden Star Ferries",
    sector: "Μεταφορές",
    accept: ["Golden Star Ferries", "Golden Star", "Γκόλντεν Σταρ"],
    search: ["Golden Star Ferries logo"],
  },
  {
    id: "fast-ferries",
    brand: "Fast Ferries",
    sector: "Μεταφορές",
    accept: ["Fast Ferries", "Φαστ Φέρις", "Φαστ Φερις"],
    search: ["Fast Ferries logo"],
  },

  // ─── Γαλακτοκομικά (expansion) ───────────────────────────────────────────
  {
    id: "giannotiko",
    brand: "Γιαννιώτικο",
    sector: "Γαλακτοκομικά",
    accept: ["Γιαννιώτικο", "Γιαννιωτικο", "Giannotiko", "Γιαννιώτικο Γάλα"],
    search: ["Giannotiko galaktokomika logo"],
  },
  {
    id: "agno",
    brand: "ΑΓΝΟ",
    sector: "Γαλακτοκομικά",
    accept: ["ΑΓΝΟ", "AGNO", "Αγνο"],
    search: ["AGNO dairy logo"],
  },

  // ─── Ασφάλειες (expansion — from the operator's screenshot) ──────────────
  // Greek-market insurers only; the B2B/broker rows in that image (QEL, R&Q,
  // Yellow Project, Brokins, Apeiron, LEV INS) are deliberately skipped as
  // failing the household-name test.
  {
    id: "ergo",
    brand: "ERGO",
    sector: "Ασφάλειες",
    accept: ["ERGO", "Έργκο", "Εργκο", "ERGO Ασφαλιστική"],
    search: ["ERGO insurance logo"],
  },
  {
    id: "minetta",
    brand: "Μινέττα",
    sector: "Ασφάλειες",
    accept: ["Μινέττα", "Μινεττα", "Minetta", "Ασφάλειαι Μινέττα"],
    search: ["Minetta insurance logo"],
  },
  {
    id: "eurolife",
    brand: "Eurolife FFH",
    sector: "Ασφάλειες",
    accept: ["Eurolife", "Eurolife FFH", "Γιουρολάιφ", "Ευρωλάιφ"],
    search: ["Eurolife FFH logo"],
  },
  {
    id: "groupama",
    brand: "Groupama",
    sector: "Ασφάλειες",
    accept: ["Groupama", "Γκρουπαμά", "Γκρουπαμα"],
    search: ["Groupama logo"],
  },
  {
    id: "ydrogios",
    brand: "Υδρόγειος",
    sector: "Ασφάλειες",
    accept: ["Υδρόγειος", "Υδρογειος", "Ydrogios", "Υδρόγειος Ασφαλιστική"],
    search: ["Ydrogios insurance logo"],
  },
  {
    id: "interlife",
    brand: "Interlife",
    sector: "Ασφάλειες",
    accept: ["Interlife", "Ίντερλαϊφ", "Ιντερλαιφ"],
    search: ["Interlife insurance logo"],
  },
  {
    id: "orizon",
    brand: "Ορίζων",
    sector: "Ασφάλειες",
    accept: ["Ορίζων", "Οριζων", "Orizon", "Ορίζων Ασφαλιστική"],
    search: ["Orizon insurance logo"],
  },
  {
    id: "dynamis",
    brand: "Δύναμις",
    sector: "Ασφάλειες",
    accept: ["Δύναμις", "Δυναμις", "Dynamis", "Δύναμις Ασφαλιστική"],
    search: ["Dynamis insurance logo"],
  },
  {
    id: "evropi-asfalistiki",
    brand: "Ευρώπη Ασφαλιστική",
    sector: "Ασφάλειες",
    accept: ["Ευρώπη Ασφαλιστική", "Ευρωπη Ασφαλιστικη", "Ευρώπη", "Evropi"],
    search: ["Evropi Asfalistiki logo"],
  },
  {
    id: "euroins",
    brand: "Euroins",
    sector: "Ασφάλειες",
    accept: ["Euroins", "Γιουρόινς", "Ευρωινς"],
    search: ["Euroins logo"],
  },
  {
    id: "wakam",
    brand: "Wakam",
    sector: "Ασφάλειες",
    accept: ["Wakam", "Γουακάμ", "Βακάμ"],
    search: ["Wakam logo"],
  },
  {
    id: "elpa-asfaleies",
    brand: "ΕΛΠΑ Ασφάλειες",
    sector: "Ασφάλειες",
    accept: ["ΕΛΠΑ", "ELPA", "Ελπα", "ΕΛΠΑ Ασφάλειες"],
    search: ["ELPA insurance logo", "ELPA Greece logo"],
  },
];
