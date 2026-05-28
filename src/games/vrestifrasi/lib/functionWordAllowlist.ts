// Vres Tin Frasi — Function Word Allowlist.
// Short Greek function words (≤ 3 letters) accepted as valid phrase guess words
// regardless of whether they appear in the 4–8 letter word pools.
// All entries are already normalized (no accents, lowercase, ς→σ).

export const FUNCTION_WORD_ALLOWLIST = new Set<string>([
  // ── 2-letter words ──────────────────────────────────────────────────────────
  "με",  // with / me
  "σε",  // in / to / you (acc.)
  "αν",  // if
  "κι",  // and (informal)
  "τι",  // what
  "να",  // to / let (subjunctive)
  "θα",  // will (future particle)
  "μα",  // but
  "εκ",  // out of (formal)
  "εν",  // in (archaic)
  "ωσ",  // as / like (normalized from ως)
  "το",  // the (neut. sg.)
  "τα",  // the (neut. pl.)
  "ει",  // if / whether (archaic)
  "δε",  // but / and (shortened)
  "μη",  // not (negative)
  "τω",  // to the (archaic dative)
  "ωσ",  // as (normalized from ως)
  // ── 3-letter words — function / particles ───────────────────────────────────
  "και", // and
  "για", // for / because
  "απο", // from (normalized from από)
  "στο", // in/at the (neut. sg.)
  "στη", // in/at the (fem. sg.)
  "στα", // in/at the (neut. pl.)
  "τον", // the (masc. acc.)
  "την", // the (fem. acc.)
  "του", // of the
  "τησ", // of the (fem., normalized from της)
  "μου", // my / of me
  "σου", // your / of you
  "που", // who / which / where
  "δεν", // not
  "μην", // don't (negative imperative)
  "ολη", // all (fem., normalized from όλη)
  "ολο", // all (neut., normalized from όλο)
  "ολα", // all (neut. pl., normalized from όλα)
  "ενα", // a / one (neut., normalized from ένα)
  "εδω", // here (normalized from εδώ)
  "ναι", // yes
  "οχι", // no (normalized from όχι)
  "αρα", // so / therefore (normalized from άρα)
  "μεν", // indeed / on the one hand
  "γαρ", // for / because (archaic)
  "αμα", // as soon as / once
  "πια", // anymore (normalized from πια)
  "πωσ", // how (normalized from πώς)
  "εωσ", // until (normalized from έως)
  "νυν", // now (archaic)
  // ── Short imperatives & exclamations (very common in phrases) ───────────────
  "δεσ", // look/see! (imperative of βλέπω, normalized from δες)
  "πεσ", // say/tell! (imperative of λέω, normalized from πες)
  "ελα", // come! (imperative of έρχομαι, normalized from έλα)
  "βρε", // hey/mate (Greek exclamation particle)
  "ντε", // come on / hey (emphatic particle)
]);
