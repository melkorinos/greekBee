// attribution.ts — the license obligation for the Topothesies boundary data.
//
// The silhouettes are dissolved from OpenStreetMap administrative boundaries
// (admin_level=7 δήμοι), which are published under the Open Database License
// (ODbL). ODbL permits commercial use WITH attribution, so this credit line is
// not optional — it is rendered verbatim in the game's How-to-Play / info modal
// (ADR 0018).
//
// If any answer id is ever sourced from the old geoBoundaries feed instead (see
// GEOBOUNDARIES_FALLBACK_IDS in scripts/generateTopothesies.ts), its CC-BY line
// — "Όρια: geoBoundaries (CC BY 4.0)", https://www.geoboundaries.org/ — must be
// restored here alongside the OSM credit.

export const TOPOTHESIES_ATTRIBUTION = {
  text: "Όρια: © OpenStreetMap contributors (ODbL)",
  href: "https://www.openstreetmap.org/copyright",
  licenseHref: "https://opendatacommons.org/licenses/odbl/",
} as const;
