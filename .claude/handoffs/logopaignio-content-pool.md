# Handoff: Λογοπαίγνιο — content pool (source, curate, grow to 150–200)

**Date:** 2026-07-27 (updated after expansion #2 — the operator's category cull + brand additions)
**Status:** Game code shipped (`wip:true`, single placeholder). **196/239 candidates have a downloaded asset; the other 43 need an operator-supplied image.** Automated sourcing is finished — the remaining work is human.
**Goal:** Curate real puzzles up to **150–200** brands so the daily rotation doesn't repeat for months. First **~30** unlocks a proper wip build; 150 is the launch floor.
**Owner:** Human-led with agent assist.

---

## Where this stands

| | Count |
|---|---|
| Candidate brands in the seed list | **239** |
| With a downloaded asset | **196** |
| — from Wikimedia Commons (Plan A) | ~76 |
| — from official sites (Plan B) | ~105 |
| — from Google favicon cache (Plan C) | ~11 |
| — from Wikipedia (Plan D) | 3 |
| — from the Wayback Machine (Plan E) | 2 |
| **Awaiting an operator-supplied image (Plan F)** | **43** |
| Cards clean / flagged in the preview | 84 / 112 |

**Nothing has been approved yet.** Every asset is in gitignored staging (`public/logopaignio/_raw/`); `puzzles-el.json` still holds only the fake «Δείγμα» placeholder. The eye check is the next human step.

**Review surface:** `.claude/aiHelper/logopaignio-preview.html` — 239 cards grouped by sector, with filter buttons (Όλα / Καθαρά / Με προειδοποίηση / Προβληματικά / Χωρίς αρχείο / **Θέλουν εικόνα από εσένα**). Regenerate with `npm run logopaignio:preview`.

---

## Expansion #2 (2026-07-27) — what changed

The operator culled the B2B-heavy sectors and added consumer categories. Net: 159 → 230 rows (24 deleted, 95 added); a later pass dropped the duplicate Goody's sub-brand and added 10 radio stations, landing at **239**.

**Sectors deleted outright:** «Αεροπορική εταιρεία», «Κατασκευές», «Ενέργεια», «Τηλεπικοινωνίες», «Φαρμακευτικά». **«Βιομηχανία» culled to four** — ΤΙΤΑΝ, Πίτσος, Alumil, Ηρακλής.

**Olympic Airways was rescued** from the deleted airline sector into «Μεταφορές». Deleting a sector should not cost the pool its strongest mark, and the six meander rings are exactly that. Αθηναϊκή Ζυθοποιία likewise moved from Βιομηχανία into «Υγρά», next to the Mythos and ΑΛΦΑ labels it brews.

**«Master/parent brand only» is RELAXED, not excepted.** The household name is often the product, not the company — Mythos, ΑΛΦΑ, Lacta, Molto, 7Days, Πάμε Στοίχημα, ΤΖΟΚΕΡ, Nescafé are all in scope alongside their parents. The Cosmote caveat survives in spirit: if the only separable mark belongs to a foreign parent and carries none of the brand's own identity, drop it.

**New/merged sectors.** «Υγρά» (43) absorbs the old «Αναψυκτικά» plus waters, beer, wine and spirits — the operator's call, and the name is a **working label to be renamed before launch**. «Καφέ» folded into «Εστίαση» (23), which is **no longer deferred** — the amber TODO banner is gone and those cards are ready for review. «Ηλεκτρονικά» folded into «Λιανική», and «Τυριά & αλλαντικά» was created, both later absorbed by the second fold below.

**Second fold (same day, operator's call).** Sector count went 20 → 13:
- «Γαλακτοκομικά» + «Τυριά & αλλαντικά» → **«Τρόφιμα»** (42)
- «Ασφάλειες» + «Ύδρευση» + «Ηλεκτρονικό εμπόριο» + «Λιανική» + «Βιομηχανία» + «Ψυχαγωγία» → **«Εταιρείες»** (41)

Final shape (239 rows, 13 sectors): Υγρά 43, Τρόφιμα 42, Εταιρείες 41, Εστίαση 22, **Μέσα ενημέρωσης 21**, Μεταφορές 14, Τυχερά 12, Καύσιμα 9, Delivery 9, Σούπερ μάρκετ 8, Τράπεζα 7, Μουσική 6, Καλλυντικά 5.

**Radio stations added to Μέσα ενημέρωσης** (2026-07-28, operator request): Εν Λευκώ, Ρυθμός, Red 96.3, Δρόμος, Μελωδία, Σφαίρα, Athens DeeJay, Kiss, Δίεση, Best — taking the sector from 11 to 21 and making it TV+radio rather than TV-only. Station marks suit the icon-only filter well (a frequency dial or monogram is often the whole logo). Four resolved cleanly (Red, Δρόμος, Μελωδία, Σφαίρα); Athens DeeJay resolved but is a **pure wordmark**, so it likely fails the filter on review. Two traps worth remembering: Commons returned **KIIS FM of Los Angeles** for Kiss 92.9, and **rythmos.gr is not the station at all** — it serves Burg-Wächter, a German lock manufacturer.

> **A reservation on «Εταιρείες», recorded because it was raised and overruled.** The fold puts Jumbo, IKEA, Zara and attica — shops a player pictures instantly — in the same hint bucket as ΕΥΔΑΠ and Alumil. Since the sector *is* the free hint, a 41-row bucket spanning "shop you visit" to "aluminium extruder" tells the player almost nothing, and «Εταιρείες» is additionally near-vacuous (every brand in the pool is a company). If daily play shows the hint feels useless, splitting the retail rows back out is the first thing to try.

**Media Markt was deliberately not added** — it exited Greece in 2018 (sold to Public). Praktiker stays; it still trades.

---

## The pipeline (three commands)

```
npm run logopaignio:fetch      # Plan A  Wikimedia Commons  → _raw/ + manifest.json
npm run logopaignio:official   # Plan B  official sites  + Plan C  Google favicons
npm run logopaignio:wikipedia  # Plan D  Wikipedia article infobox images
npm run logopaignio:wayback    # Plan E  archived homepages (Internet Archive)
npm run logopaignio:import     # Plan F  operator-supplied images ← the remaining path
npm run logopaignio:preview    # renders the eye-check page from the manifest
```

**Plan F is where the remaining 43 brands get resolved.** Drop images into `public/logopaignio/_manual/` (gitignored), each named after its **seed id** — `mythos.png`, `epsa.svg`. The preview prints the exact filename on every purple "ΘΕΛΕΙ ΕΙΚΟΝΑ ΑΠΟ ΕΣΕΝΑ" card, so it can be copied straight off the page; the **«Θέλουν εικόνα από εσένα» filter button** lists them all. The importer validates by magic bytes (an HTML error page saved as `.png` is rejected — that has bitten this project), enforces the same 64px floor as the automated passes, and refuses a filename whose id is not in the seed list, so a typo fails loudly instead of vanishing.

Run them in that order; D and E only chase brands that still have no asset, so they are cheap to re-run. **Plans D and E have materially worse precision than A–C** — see their yields below — and every row they produce is warning-flagged in the preview on purpose.

**Measured yield of the late passes (2026-07-28).** Plan D: 36 attempted, 25 "hits", **3 real** (Αλλατίνη, FM Records, Notos Galleries). Plan E: 26 attempted, 3 hits, **2 real** (Πάμε Στοίχημα — a genuinely excellent icon-only X mark that the parent's site could not provide — and Pizza Fan, a 2015 app icon). One WebP fix in Plan B was worth as much as either: it recovered Άλτις, Ήπειρος and TAF Coffee, which had been failing as "unusable format" purely because the fetcher did not know the format.

**Social media (Facebook/Instagram profile pictures) was considered and dropped** — both now require authentication for profile images, so there is no unauthenticated route. That was the last untried automated source; what remains genuinely needs a human.

Data files:
- `scripts/lib/logopaignio/seedBrands.mjs` — the 239 candidates (id, brand, sector, accept-list, Commons search terms). **`search: null` pins a brand to manual sourcing**, so no future automated run re-fetches an asset already judged wrong.
- `scripts/lib/logopaignio/officialSites.mjs` — ~165 domain mappings for Plan B
- `public/logopaignio/_raw/manifest.json` — machine-readable result of every attempt (gitignored)

All three scripts merge into the same manifest, so `--only <ids>` re-runs a subset without losing earlier results. A failed re-fetch never overwrites a good row.

**Two manifest traps this cost time on, both fixed but worth knowing.** The merge is by `id` and never deletes, so (1) brands removed from the seed list leave **orphan rows** behind that keep appearing in the preview — expansion #2 pruned 24; and (2) because a failed re-fetch preserves the previous good row, **a retry that fails leaves the WRONG asset in place looking healthy**. That is what happened to `kino`/`pamestoixima`: their first run grabbed ΟΠΑΠ's corporate PNG, the corrected retry failed, and the bad file survived. When you re-point a domain because the asset was wrong, verify the retry actually succeeded — a silent hold-over is indistinguishable from a fresh success in the preview.

A third: the manifest cached `sector` from whenever a row was last fetched, so rows carried labels from **before** the first session's merges (Ακτοπλοΐα, Ταχυμεταφορές, Καφέ). The preview groups by that field, so it rendered phantom sections. Sector/brand/accept are now re-synced from the seed list after each run — re-run that sync if you re-sector anything.

---

## Decisions made this session (do not silently revert)

**Greek-origin rule DROPPED.** The pool is now *"brands a Greek audience recognizes"*, regardless of origin — DHL, Revolut, Sprite, Fanta, Pepsi, Wolt, Groupama, Lidl et al. are in scope. Recognizability is still required. The icon-only filter is untouched and remains the rule that actually keeps the game playable.

**Sector merges.** «Ταχυδρομείο» + «Ταχυμεταφορές» → **Delivery**; «Ακτοπλοΐα» + «Μεταφορές» → one **Μεταφορές**. Sector is the in-game free hint, so fewer/fatter categories give away less.

~~**Εστίαση is deferred**~~ — **reversed in expansion #2.** The operator added the coffee and fast-food chains and wants them reviewed with everything else, so `DEFERRED_SECTORS` in `preview-logopaignio.mjs` is now empty. The mechanism stays in place — it costs nothing and the next parked sector will want it.

**Mark canvas: 512×512 square**, mark centred, 12% padding — recorded in `src/config/gameRules.ts` as `LOGOPAIGNIO.MARK_CANVAS_PX` / `MARK_PADDING_RATIO`.

> Why square, and why it matters beyond looks: the three PoC crops came out at ratios **1.00 / 1.00 / 0.74**, while the full logos they came from were **4.53 / 3.48 / 4.89** wide — the extreme widths belong to the *wordmark*, which the crop removes. And `BLUR_STEP_RADII_PX` is in **fixed pixels**, so on an un-normalised pool the same 16px first look *erases* a thin 11:1 strip while barely hazing a large square. Un-normalised assets make difficulty depend on a logo's shape rather than on how recognizable it is.

**Skipped deliberately:** «Candia (αυτοκινητοβιομηχανία)» (Candia is a dairy brand; the carmaker was Namco) and «Dekagro» (no public presence).

---

## What the scripts flag automatically (and why to trust the flags)

Commons search ranks by text relevance and has no idea which country or company you mean. Blind "first hit" returned confident nonsense: **ΔΕΗ → "Namibia Power Corporation"**, **Κρι Κρι → an Indonesian hospital** (1.35 MB), **ΣΤΑΣΥ → a Lithuanian choir competition**, **MAD TV → *Mad Men***, **Cosmos Aluminium AND Αλουμίνιον της Ελλάδος → both got ETEM's logo**.

So the fetcher now requires a distinctive token from the brand's own accept-list to appear in the file title, and flags failures as **SUSPECT** (red card). It over-flags on purpose — `ote` and `ert` are false alarms (correct files, Latin-cased titles vs Greek accept-lists). A wrong flag costs one glance; a missed one poisons the pool.

Still flagged suspect, needing your verdict: `kri-kri`, `stasy` (genuinely wrong) and `ert` (false alarm). The `dei`/`nova`/`forthnet`/`ote` cases resolved themselves — those brands were deleted with their sectors in expansion #2.

**Expansion #2 added a new failure mode the guard does not catch.** Seven Commons matches were provably wrong and have been reset to `not-found`: `amstel`→JammFM radio, `molto`→a Palermo conference, `ifantis`→Dealz, `nikas`→Fay, `olympus-tyri`→a PBS wordmark, `heaven-music`→"Up to heaven", and — the important one — **`pizza-fan` silently downloaded Pizza Hut's logo**.

That last one passed the guard cleanly. The check requires a distinctive accept-list token in the file title, and *"pizza"* is genuinely in both brands' names, so a real shared word defeated it. The lesson for the next session: **the token guard catches unrelated matches, not competitors in the same category.** Two brands in one sector whose names share a word (πίτσα, καφές, μπίρα) can match each other's files without a flag. Sector-mates now warrant a closer look during the eye check than the flag colour alone suggests.

**Plan D (Wikipedia) added a THIRD failure mode, and it is the nastiest.** Of 25 apparent hits, 22 were wrong, in two distinct ways:

*Word collision.* Greek consumer brands are usually named after ordinary Greek words, so the article about the **word** outranks the article about the **company**: Κορφή → a mountain peak, Ιόλη → the mythological figure, Καϊάφας → a lake, Ήβη → the goddess, Ήπειρος → the region, Ελίτ → the adjective, Βενέτης and Τσακίρης → people with those surnames. A title-token check cannot separate these, because the token genuinely matches.

*Same-industry substitution.* When a brand has no article at all, Wikipedia's search helpfully returns its **nearest competitor** — Pizza Fan → Pizza Hut, Σκλαβενίτης Cash&Carry → **Walmart**, Γρηγόρης → **Mikel**, Golden Star Ferries → **Blue Star Ferries**. These defeat every downstream check: they are real company articles carrying real logos, so "is this a company?" and "is this a photograph?" both answer correctly and still let the wrong brand through.

Three guards now sit in `fetch-logopaignio-wikipedia.mjs`: the article must look like a company (categories/intro vocabulary, in both languages), the image must not be photograph-sized, and — the one that catches substitution — **the article title must BE one of the brand's own names**, not merely contain a word from one. With all three, the known-bad set returns nothing. Plan D rows are still warning-flagged in the preview; treat every one as suspect until seen.

**Remaining duplicate groups** (identical byte counts, so probably the same file):
- `dodoni` / `giannotiko` — **correct and expected**: Γιαννιώτικο is a Δωδώνη brand. Drop one.
- `goodys` / `goody-s-burger-house` — same company, same mark. Dedupe.
- `creta-farms` / `icc-courier` — **coincidence, verified**: each came from its own correct domain. No action.

Other automatic checks: HTML-error-pages-saved-as-images are rejected (this bit once — `geniki-taxydromiki` saved a whole error page as `logo.svg`); raster assets under 64px are rejected; Plan C's floor is 128px because Google answers a *miss* with a 16×16 globe at status 200, never a 404. Favicon `sizes` attributes lie and are never trusted — apivita.com advertises a 1024×1024 icon that 404s, eydap.gr's "favicon.png" is 16×16, olympos.gr's "192" icon is really 32×32.

---

## The 43 awaiting an operator image

**Automated sourcing is exhausted for all of them** — every one has been through Commons (with retuned terms), official sites (with corrected hints and full browser headers), favicons, Wikipedia and Wayback. Every row is `status: "manual"`, so the preview's «Θέλουν εικόνα από εσένα» filter is the working list. Grouped by why automation lost:

| Cause | Brands |
|---|---|
| No resolving domain, no archive snapshot | `voreia`, `korfi`, `ioli`, `loutraki`, `kaiafas`, `doubles`, `karalis`, `eyellinikon`, `ta-adelfia`, `kotobiky`, `roast-bakery`, `venetis`, `diesi`, `best-radio`, `kiss-fm` |
| Blocked (403/502) even with full browser headers | `sklavenitis-cash`, `winmasters`, `tsakiris`, `orizon`, `euroins`, `en-lefko` |
| Site reachable but holds no usable mark | `olympos` (32px), `grigoris`/`gregorys` (16px), `elite-tsakiris`, `mythos`, `plomari`, `ivi`, `coral`, `evropi-asfalistiki`, `epsa`, `coffee-lab` (75px mascot) |
| **Only the PARENT company's logo is published** | `iraklis` (Lafarge), `sevendays` (Mondelez), `kourtaki` (Greek Wine Cellars), `pavlidis` (Mondelez sub-brand) |
| Site publishes award badges / certifications instead of a mark | `boutari` (winery-of-the-year), `nissos` (ΕΛΛΑ-ΔΙΚΑ ΜΑΣ) |
| Favicon only | `malamatina`, `gioutis` |
| Photo only, mark not isolable | `kyknos` (swan roundel visible in a warehouse photo) |
| Domain belongs to an unrelated company | `rythmos` (rythmos.gr is **Burg-Wächter**, a German lock maker) |
| Sub-brand mark not published machine-readably | `kino` |

### The operator's wrong-logo round (2026-07-28)

All 13 reported brands were re-attempted with Greece-anchored search terms and corrected site hints. **Two were fixed: ΕΒΓΑ** (Commons had the right file under a different name) **and Subway** (was serving the *Arabic* variant; now the 2016 SVG). The other 11 moved to Plan F.

What they were actually holding is a useful catalogue of how logo sourcing goes wrong, and none of it is detectable without eyes:

- **The web agency's logo** — `coffee-lab` had `netsteps-logo.svg`, the studio's footer credit.
- **A certification body's badge** — `nissos` had EUROCERT; the retry then found ΕΛΛΑ-ΔΙΚΑ ΜΑΣ. Both are logos on the page, just not the brand's.
- **Award badges** — `boutari` had "winery of the year" and "super brands".
- **The parent company** — `iraklis` had Lafarge (the SVG id was literally `Lafarge_Logo_RGB`), `sevendays` had Mondelez.
- **A different company with the same name** — `pavlidis` had `sunglasses-store.jpg` from an *optician* named Παυλίδης.
- **A photograph** — `kyknos` had a night shot of a warehouse.

**The operator's keyword advice works, but not the way it looks.** Anchoring searches with Greece/Athens/Greek did not make Commons find the Greek brands — it made Commons *stop returning the wrong ones*. Ten of thirteen retuned searches returned nothing at all, which is the correct answer when Commons genuinely has no file. That is a real gain: a confident wrong logo costs an eye-check and a re-fetch, while an honest miss routes straight to Plan F.

**Goody's duplicate resolved:** `goody-s-burger-house` is deleted from the seed list — it held the identical Commons file as `goodys`, and the sub-brand has no distinct mark.

**A caution for whoever sources these by hand.** Many "dead" domains were *my guesses* at a URL pattern (`nissosbeer.gr`, `korfibeer.gr`, `tafcoffee.gr`), not verified addresses. Searching for the real domain rescued six: `nissos.beer`, `greek-wine-cellars.com` (Κουρτάκη now trades as Greek Wine Cellars), `starbucks.com.gr`, `tafcoffee.com`, `heavenmusic.gr`, `cobaltmusic.gr`. "No resolving domain" means *the patterns tried* did not resolve.

**Supplying images by hand.** Drop files anywhere and name each one by its **seed id** (`mythos.png`, `ta-adelfia.svg`) — that is enough to wire them into the manifest as a sixth source alongside the five plans, and they will appear in the preview like any other card. Record where each came from if you can: the handoff keeps a `credit` per asset for the takedown path. Note that **a supplied image still has to pass the icon-only filter** — if the only art available for a brand is a pure wordmark, the image does not rescue it and the brand should be dropped instead.

---

## Next actions

1. **Name review first** (the operator's stated priority): read the 239 cards for *brand selection* — is this brand worth a puzzle, is it in the right sector, is the sector name right? «Υγρά» and «Εταιρείες» are both working labels awaiting better names.
2. **Batch eye-check** the same cards. For each: is this the right company, and does it have a separable non-text symbol? Pure wordmarks are **rejected** — the icon-only filter is what keeps the game playable. Pay extra attention to **sector-mates with shared words** (see the Pizza Hut/Pizza Fan trap above).
3. **Strip the wordmarks.** Many assets are the *full* logo, name included. Still the main remaining craft work. Layered SVGs can often be cropped by clipping the `viewBox` alone; PNG/JPGs need a manual crop.
4. **Normalise approved marks** onto the 512×512 canvas (script not yet written — mechanical, no per-brand judgment).
5. **Graduate approved rows** into `src/data/logopaignio/puzzles-el.json` with their mark in `public/logopaignio/`, then flip `wip:false` once ~30 are live.
6. **Manual-source the 36** if the pool needs them to clear 150 — read the caution in that section first.

---

## Rules (locked in the grill — do not re-litigate)

- **Current logo only** — no old/rebrand versions.
- ~~**Master/parent brand only**~~ — **RELAXED 2026-07-27 (expansion #2): sub-brands are allowed.** The household name is often the product, not the company. *The Cosmote caveat survives: if the only separable mark belongs to a foreign parent and carries none of the brand's own identity, drop it.*
- **Origin is no longer a filter** (changed 2026-07-27) — recognizability to a Greek audience is what counts.
- **Defunct brands allowed** — nostalgia marks (Olympic Airways, retired ΟΤΕ/WIND marks) are a feature and help reach depth.
- **Matching is normalized + accept-list**, never character-exact (see the game's `evaluateGuess`): case/accent-insensitive, trimmed, plus the per-brand Greek⇄Latin accept-list.
- **Icon-only filter is the one rule that must not be relaxed.** If the pool stalls, relax *"recognizable"* first — that just makes some days harder. Dropping icon-only breaks the game outright (unguessable stripped wordmarks).

---

## Legal (the one thing that could kill the game post-launch)

Every hosted logo is someone's trademark/copyright — no clean open-data license story exists (unlike the map/price games). **Decision: ship anyway** as a hobby-game risk, **with** a `credit`/source recorded per asset and a fast takedown path.

**Sharpened this session:** the two source paths carry *different* provenance, and the manifest records which is which.
- **Commons rows** carry an explicit license line (mostly PD-textlogo, trademark noted) — prefer these as the source of record.
- **Plan B/C rows** (official sites, favicon cache) have **no stated license** — they are the company's trademark retrieved from its own site. Their `credit` is `"<domain> (retrieved <date>)"`, and `license` reads `"© the company — no stated license"`.

This does not change the ship-anyway posture, but the ticket-04 legal note must state both paths honestly. Reassess if the game gets real traffic.

---

## Progress

- [ ] 30 (unlocks wip build)
- [ ] 60
- [ ] 100
- [ ] 150 (launch floor)
- [ ] 200 (comfortable)

*Automation is finished: **196 of 239 staged, 0 approved**, and the remaining **43 are all `status: "manual"`** — every plan has been run against each. With 239 candidates the pool clears the 150 launch floor **if roughly two-thirds survive the eye check**, so curation decides whether the game launches, not sourcing.*

**Two independent bottlenecks remain**, and they can proceed in parallel:
1. **Operator supplies 43 images** → `public/logopaignio/_manual/` → `npm run logopaignio:import`.
2. **Operator eye-checks the 196 already staged** — name review, then the icon-only call, then wordmark stripping.

A warning the session earned the hard way: **a card showing an asset is not a card with the right asset.** Of the 13 brands the operator flagged, every one had a plausible-looking image that was a web agency's logo, a certification badge, a parent company, a different company of the same name, or a photograph. The automated guards catch unrelated matches and photographs; they cannot catch a real logo belonging to the wrong company. Only the eye check can.
