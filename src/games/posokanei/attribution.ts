// attribution.ts — the license / source obligations for Πόσο κάνει;.
//
// Two credits are non-optional and rendered verbatim in the game's How-to-Play
// (handoff posoKanei.md):
//   • Price source — every reference price comes from the Greek government price
//     observatory (Παρατηρητήριο Τιμών), frozen at build time and never claimed
//     as "current".
//   • Photo license — each puzzle photo is open-license or shoot-your-own (never
//     the copyrighted gov `image_url`); its per-photo credit lives on the puzzle
//     row (`photoSource` / `photoLicense`) and is shown alongside this line.

export const POSOKANEI_PRICE_ATTRIBUTION = {
  text: "Πηγή τιμών: Παρατηρητήριο Τιμών (gov.gr)",
  href: "https://posokanei.gov.gr",
} as const;
