// Λογοπαίγνιο — official-site sources (PLAN B).
//
// Wikimedia Commons covers only ~half the seed list: 49 of 106 candidates had no
// usable file, and they are not obscure companies (Βίκος, ΙΟΝ, ΕΥΔΑΠ, ΤΙΤΑΝ,
// Μπάρμπα Στάθης…). Commons simply has no free-licensed file for them.
//
// Measured on 2026-07-27: of 10 missing brands probed, 9 exposed a logo asset
// directly on their own homepage — several better than anything on Commons
// (EKO 1874×377; Minoan and Everest ship true SVGs). So the company's own site is
// the best remaining source.
//
// LEGAL NOTE — this differs from the Commons path. A Commons file carries an
// explicit license line; a logo pulled from a company's own site carries none. It
// is the company's trademark, used without a stated permission. That does NOT
// change the project's existing posture (every real logo is a trademark; "ship
// anyway, with a takedown path" is the locked decision — see the handoff), but the
// per-asset `credit` becomes "source URL + retrieval date" instead of a license.
// This must be reflected in the ticket-04 legal note.
//
// `domain` is the site to scrape. `hint` narrows which asset to prefer when the
// page offers several — matched against the asset URL.

/**
 * @typedef {Object} OfficialSite
 * @property {string} id      matches a SEED_BRANDS id
 * @property {string} domain  homepage to scrape (https:// added if absent)
 * @property {string} [hint]  substring preferred when several assets match
 */

/** @type {OfficialSite[]} */
export const OFFICIAL_SITES = [
  // — verified reachable + logo asset found during the 2026-07-27 probe —
  { id: "ion", domain: "www.ion.gr" },
  { id: "eko", domain: "www.eko.gr", hint: "EKO_Logo" },
  { id: "nounou", domain: "www.nounou.gr" },
  { id: "barba-stathis", domain: "www.barbastathis.com" },
  { id: "everest", domain: "www.everest.gr" },
  { id: "minoan-lines", domain: "www.minoan.gr" },
  { id: "eydap", domain: "www.eydap.gr" },
  { id: "coffee-island", domain: "www.coffeeisland.gr" },
  { id: "frezyderm", domain: "www.frezyderm.gr" },
  { id: "titan", domain: "www.titan-cement.com" },
  { id: "apivita", domain: "www.apivita.com" },

  // — untested; same pattern, resolved on the run —
  // Domain corrected: vikos.gr serves a cert for another host and redirects to .com.
  { id: "vikos", domain: "www.vikos.com" },
  { id: "melissa", domain: "www.melissa-kikizas.gr" },
  { id: "papadopoulou", domain: "www.papadopoulou.gr" },
  { id: "misko", domain: "www.misko.gr" },
  { id: "olympos", domain: "www.olympos.gr" },
  // NOTE: ivi.gr / jetoil.gr / coral.gr do NOT resolve to the brand any more
  // (checked 2026-07-27): ivi.gr and jetoil.gr have no DNS record, and coral.gr
  // redirects to netcare.gr, an unrelated company. Both Ήβη and Jetoil are the
  // defunct/nostalgia brands the handoff expects to need manual sourcing — a dead
  // domain is exactly what a retired brand looks like. Left here, deliberately
  // pointing at the dead host, so a future session sees them as attempted-and-dead
  // rather than never-tried.
  { id: "ivi", domain: "www.ivi.gr" },
  { id: "sarantis", domain: "www.sarantisgroup.com" },
  { id: "papoutsanis", domain: "www.papoutsanis.gr" },
  { id: "lanes", domain: "www.lanes.gr" },
  { id: "anek-lines", domain: "www.anek.gr" },
  { id: "superfast-ferries", domain: "www.superfast.com" },
  { id: "seajets", domain: "www.seajets.com" },
  { id: "hellenic-seaways", domain: "www.hellenicseaways.gr" },
  { id: "eyath", domain: "www.eyath.gr" },
  { id: "elval", domain: "www.elval.com" },
  { id: "alumil", domain: "www.alumil.com" },
  { id: "acs", domain: "www.acscourier.net" },
  { id: "geniki-taxydromiki", domain: "www.taxydromiki.com" },
  { id: "spitogatos", domain: "www.spitogatos.gr" },
  { id: "car-gr", domain: "www.car.gr" },
  { id: "xe-gr", domain: "www.xe.gr" },
  { id: "box", domain: "www.box.gr" },
  { id: "novibet", domain: "www.novibet.gr" },
  // http:// only — https serves a mismatched certificate.
  { id: "grigoris", domain: "http://grigoris.gr" },
  { id: "mikel", domain: "www.mikelcoffee.com" },
  { id: "flocafe", domain: "www.flocafe.gr" },
  { id: "my-market", domain: "www.mymarket.gr" },
  { id: "galaxias", domain: "galaxias.gr" }, // no www — the www host does not resolve
  { id: "kritikos", domain: "www.kritikos-sm.gr" },
  { id: "hondos-center", domain: "www.hondoscenter.com" },
  { id: "notos-galleries", domain: "http://notosgalleries.gr" }, // https cert mismatch
  { id: "public", domain: "www.public.gr" },
  { id: "public-cinemas", domain: "www.villagecinemas.gr" },
  { id: "minos-emi", domain: "www.minosemi.gr" },
  { id: "ethniki-asfalistiki", domain: "www.ethniki-asfalistiki.gr" },
  { id: "coral", domain: "www.coral.gr" },
  { id: "avin", domain: "www.avinoil.gr" },
  { id: "jetoil", domain: "www.jetoil.gr" },

  // ── expansion batch (2026-07-27) — brands Commons had no file for ──
  { id: "nestea", domain: "www.nestea.com" },
  { id: "three-cents", domain: "www.threecents.gr" },
  { id: "amita", domain: "www.amita.gr" },
  { id: "elta-courier", domain: "elta-courier.gr" },
  { id: "icc-courier", domain: "www.icccourier.gr" },
  { id: "revoil", domain: "www.revoil.gr" },
  { id: "silkoil", domain: "www.silkoil.gr" },
  { id: "eteka", domain: "www.eteka.gr" },
  { id: "elin", domain: "www.elin.gr" },
  { id: "pelargos", domain: "www.pelargos.gr" },
  { id: "art-tv", domain: "www.arttv.gr" },
  { id: "mad-tv", domain: "www.mad.tv" },
  { id: "vouli-tileorasi", domain: "www.hellenicparliament.gr" },
  { id: "rise-tv", domain: "rise.gr" },
  { id: "athinaiki-zythopoiia", domain: "www.athenianbrewery.gr" },
  { id: "cosmos-aluminium", domain: "www.cosmosaluminium.gr" },
  { id: "skag", domain: "www.skag.gr" },
  { id: "allatini", domain: "www.allatini.gr" },
  { id: "aluminion-ellados", domain: "www.metlengroup.com" },
  { id: "vianex", domain: "www.vianex.gr" },
  { id: "evga", domain: "www.evga.gr" },
  { id: "estia", domain: "www.estia-sa.gr" },
  { id: "etem", domain: "www.etem.com" },
  { id: "iraklis", domain: "www.lafarge.gr" },
  { id: "kyknos", domain: "www.kyknos.gr" },
  { id: "naupigeia-elefsinas", domain: "www.neltd.gr" },
  { id: "chalyvourgia", domain: "www.chalyvourgia.gr" },
  { id: "golden-star-ferries", domain: "www.goldenstarferries.gr" },
  { id: "fast-ferries", domain: "fastferries.com.gr" },
  // Γιαννιώτικο is a ΔΩΔΩΝΗ brand — sourced from the parent's site.
  { id: "giannotiko", domain: "dodoni.com" },
  { id: "agno", domain: "www.agno.gr" },
  { id: "minetta", domain: "www.minetta.gr" },
  { id: "eurolife", domain: "www.eurolife.gr" },
  { id: "ydrogios", domain: "www.ydrogios.gr" },
  { id: "interlife", domain: "www.interlife.gr" },
  { id: "orizon", domain: "www.orizonins.gr" },
  { id: "dynamis", domain: "dynamis.gr" },
  { id: "evropi-asfalistiki", domain: "www.europi.gr" },
  { id: "euroins", domain: "www.euroins.gr" },
  { id: "wakam", domain: "www.wakam.com" },
  { id: "elpa-asfaleies", domain: "www.elpa.gr" },
  // Commons matched these to the WRONG entity (DHL flagged suspect; ERGO resolved
  // to the Estonian arm), so they are sourced from the brand's own site instead.
  { id: "dhl", domain: "www.dhl.com" },
  { id: "ergo", domain: "www.ergohellas.gr" },
];
