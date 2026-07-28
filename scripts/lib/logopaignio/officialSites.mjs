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
  { id: "anek-lines", domain: "www.anek.gr" },
  { id: "superfast-ferries", domain: "www.superfast.com" },
  { id: "seajets", domain: "www.seajets.com" },
  { id: "hellenic-seaways", domain: "www.hellenicseaways.gr" },
  { id: "eyath", domain: "www.eyath.gr" },
  { id: "alumil", domain: "www.alumil.com" },
  { id: "acs", domain: "www.acscourier.net" },
  { id: "geniki-taxydromiki", domain: "www.taxydromiki.com" },
  { id: "spitogatos", domain: "www.spitogatos.gr" },
  { id: "car-gr", domain: "www.car.gr" },
  { id: "xe-gr", domain: "www.xe.gr" },
  { id: "box", domain: "www.box.gr" },
  { id: "novibet", domain: "www.novibet.gr" },
  // http:// only — https serves a mismatched certificate.
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
  { id: "art-tv", domain: "www.arttv.gr" },
  { id: "mad-tv", domain: "www.mad.tv" },
  { id: "vouli-tileorasi", domain: "www.hellenicparliament.gr" },
  { id: "rise-tv", domain: "rise.gr" },
  { id: "athinaiki-zythopoiia", domain: "www.athenianbrewery.gr" },
  { id: "allatini", domain: "www.allatini.gr" },
  { id: "evga", domain: "www.evga.gr" },
  { id: "iraklis", domain: "www.lafarge.gr" },
  { id: "kyknos", domain: "www.kyknos.gr" },
  { id: "golden-star-ferries", domain: "www.goldenstarferries.gr" },
  { id: "fast-ferries", domain: "fastferries.com.gr" },
  // Γιαννιώτικο is a ΔΩΔΩΝΗ brand — sourced from the parent's site.
  { id: "giannotiko", domain: "dodoni.com" },
  { id: "agno", domain: "www.agno.gr" },
  { id: "minetta", domain: "www.minetta.gr" },
  { id: "eurolife", domain: "www.eurolife.gr" },
  { id: "ydrogios", domain: "www.ydrogios.gr" },
  { id: "interlife", domain: "www.interlife.gr" },
  { id: "wakam", domain: "www.wakam.com" },
  // Commons matched these to the WRONG entity (DHL flagged suspect; ERGO resolved
  // to the Estonian arm), so they are sourced from the brand's own site instead.
  { id: "dhl", domain: "www.dhl.com" },
  { id: "ergo", domain: "www.ergohellas.gr" },

  // ══════════════════════════════════════════════════════════════════════════
  // EXPANSION #2 (2026-07-27) — betting, music labels, beer/wine/spirits/water,
  // cheese & charcuterie, εστίαση chains, retailers, Greek food classics.
  //
  // Commons resolved only 24 of these 95: Greek consumer brands are precisely
  // what Commons lacks (no free-licensed file exists for Ζαγόρι or Τερκενλής),
  // so the company's own site is the primary source for this batch, not the
  // fallback it was for the first pass.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Υγρά: μπίρα ──
  { id: "mythos", domain: "www.mythosbrewery.gr" },
  { id: "alfa-beer", domain: "www.alfabeer.gr" },
  { id: "vergina-beer", domain: "www.verginabeer.com" },
  // hint avoids EUROCERT_LOGO_final_small.png — a CERTIFICATION BODY's badge in
  // the footer, which the unhinted run picked as "the logo".
  { id: "nissos", domain: "nissos.beer", hint: "uploads/Logo" },
  { id: "septem", domain: "www.septem.gr" },
  // voreia / korfi: no domain found on any guessed pattern (.gr/.com). Left out of
  // Plan B rather than pointed at a dead host — they need manual sourcing.
  { id: "amstel", domain: "www.amstel.gr" },

  // ── Υγρά: κρασί & ποτά ──
  { id: "boutari", domain: "www.boutari.gr" },
  // Κουρτάκη is now trading as Greek Wine Cellars — the Kourtaki name survives as
  // one of its labels, which is exactly the sub-brand case the relaxed rule allows.
  { id: "malamatina", domain: "www.malamatina.gr" },
  { id: "lazaridi", domain: "www.domaine-lazaridi.gr" },
  { id: "plomari", domain: "www.plomari.gr" },
  { id: "barbayanni", domain: "www.barbayanni-ouzo.com" },
  { id: "tsipouro-tirnavou", domain: "www.tsipourotirnavou.gr" },

  // ── Υγρά: νερά ──
  { id: "zagori", domain: "www.zagoriwater.gr" },
  { id: "avra", domain: "www.avrawater.gr" },
  { id: "theoni", domain: "www.theoni.gr" },
  { id: "souroti", domain: "www.souroti.gr" },
  { id: "ioli", domain: "www.ioli.gr" },
  { id: "korpi", domain: "www.korpi.gr" },
  // Domain found by WebSearch, not guessed — "doumpia.gr" (the transliteration
  // this file first assumed) does not exist; the company spells it "doubia".
  { id: "doubles", domain: "www.doubia.gr" },

  // ── Τρόφιμα ──
  { id: "loumidis", domain: "www.loumidis.gr" },
  { id: "pavlidis", domain: "www.pavlidis.gr" },
  { id: "lacta", domain: "www.lacta.gr" },
  { id: "terkenlis", domain: "www.terkenlis.gr" },
  { id: "tsakiris", domain: "www.tsakiris.gr" },
  { id: "sevendays", domain: "www.7days.com" },
  { id: "elite-tsakiris", domain: "www.elite.gr" },
  { id: "minerva", domain: "www.minerva.com.gr" },
  { id: "altis", domain: "altis.com.gr" },
  { id: "gioutis", domain: "www.giotis.gr" },

  // ── Τυριά & αλλαντικά ──
  { id: "ifantis", domain: "www.ifantis.gr" },
  { id: "nikas", domain: "www.nikas.gr" },
  { id: "creta-farms", domain: "www.cretafarms.gr" },
  { id: "venetis", domain: "www.venetis.gr" },
  { id: "dodoni", domain: "dodoni.com" },
  { id: "epirus", domain: "www.ipiros.gr" },
  { id: "olympus-tyri", domain: "www.tyras.gr" },

  // ── Εστίαση ──
  { id: "pizza-fan", domain: "www.pizzafan.gr" },
  { id: "simply-burgers", domain: "www.simplyburgers.gr" },
  { id: "starbucks", domain: "starbucks.com.gr" },
  // hint avoids netsteps-logo-1.svg — the WEB AGENCY that built the site. A
  // footer "made by" credit is a logo on the page like any other, so an unhinted
  // "first logo-ish asset" pick has no way to know it is the wrong company.
  { id: "coffee-lab", domain: "www.coffeelab.gr", hint: "coffeelab" },
  { id: "taf-coffee", domain: "tafcoffee.com" },
  // roast-bakery: no resolving domain found — manual sourcing.

  // ── Λιανική ──
  { id: "moustakas", domain: "www.moustakastoys.gr" },
  { id: "attica-stores", domain: "www.atticadps.gr" },
  { id: "factory-outlet", domain: "www.factoryoutlet.gr" },
  { id: "sklavenitis-cash", domain: "www.themart.gr" }, // 403 on UA alone; opens with full browser headers

  // ── Τυχερά παιχνίδια ──
  // The ΟΠΑΠ sub-brands were first pointed at the parent (www.opap.gr) and all
  // three came back with the SAME file — ΟΠΑΠ's corporate PNG, not the game's own
  // mark. Sub-brands are in scope precisely because they have their own identity,
  // so a parent-logo fallback is a wrong answer, not a partial one. Retried
  // against each game's own site.
  { id: "pamestoixima", domain: "www.pamestoixima.gr" },
  { id: "tzoker", domain: "www.tzoker.gr" },
  { id: "kino", domain: "www.opaponline.gr", hint: "kino" },
  { id: "fonbet", domain: "www.fonbet.gr" },

  // ── Μουσική ──
  { id: "panik-records", domain: "www.panikrecords.gr" },
  { id: "heaven-music", domain: "heavenmusic.gr" },
  { id: "cobalt-music", domain: "cobaltmusic.gr" },
  { id: "spicy-music", domain: "www.spicy.gr" },

  // ── Ραδιόφωνο (2026-07-28) ──
  // enlefko.FM, not .gr — the .gr guess 403'd because it is a different host
  // entirely. Found by WebSearch. kissfm.gr still does not resolve.
  { id: "en-lefko", domain: "www.enlefko.fm" },
  // rythmos.gr is NOT the radio station — it resolves to Burg-Wächter, a German
  // lock manufacturer. Removed rather than re-pointed: the station's real domain
  // was not found, so Ρυθμός goes to manual sourcing.
  { id: "red-fm", domain: "www.redfm.gr" },
  { id: "dromos-fm", domain: "www.dromosfm.gr" },
  { id: "melodia-fm", domain: "melodia.gr" },
  { id: "athens-deejay", domain: "www.athensdeejay.gr" },
  // fm-records: no resolving domain on any guessed pattern — manual sourcing.
];
