# Handoff: Λογοπαίγνιο — content pool (source, curate, grow to 150–200)

**Date:** 2026-07-27 (folds in the former `logopaignio.md` design spec)
**Status:** Game code shipped (`wip:true`, single placeholder). Content is the remaining work.
**Goal:** Curate real puzzles up to **150–200** brands so the daily rotation doesn't repeat for months. First **~30** unlocks a proper wip build; 150 is the launch floor.
**Owner:** Human-led with agent assist. See "Division of labour" — the agent can now do more of the sourcing than originally assumed.

This is the single content handoff for Λογοπαίγνιο. The design decisions, seed list, and legal note that used to live in `logopaignio.md` are folded in below; the implementation plan is dropped because the game is built.

---

## Working approach (agreed 2026-07-27, after the 5-brand PoC)

**Gather broad, approve one-by-one with an eye check.** The agent sources a large batch of candidate marks (full logo + a mark-only crop + draft accept-list + credit); the human eyeballs each and approves or rejects individually. This scales the boring half (finding + fetching + cropping) and keeps the judgment half (recognizable? right mark? still-Greek?) with the human, where it belongs.

### What the PoC proved (5 brands: Alpha Bank, Cosmote, Aegean, HelleniQ, Public)

- **Sourcing + download works.** `scripts/fetch-logopaignio-logos.mjs` pulls real SVGs from Wikimedia Commons "Original file" URLs into `public/logopaignio/_raw/`, with the license recorded per row for takedown readiness.
- **Mark extraction is often scriptable, not manual.** When a logo ships as **layered vector paths** (symbol and wordmark as separate `<path>`s at separate x-ranges), the mark can be isolated just by clipping the SVG `viewBox` — no image editor. This is better than the original spec assumed. Raster-only or single-flattened-path logos still need a manual crop.
- **The real bottleneck is judgment, not fetching** — exactly the calls left to the human eye check.

### PoC verdicts (locked)

| Brand | Verdict | Note |
|---|---|---|
| **Alpha Bank** | ✅ keep | Navy square + white "A" is a clean standalone mark. |
| **Aegean Airlines** | ✅ keep | Approved. (2020 file's motif is thin; prefer the tail-livery mark if sourcing a better asset.) |
| **HelleniQ Energy** | ✅ keep | Lower recognition, but kept; pinwheel emblem crops perfectly. Accept-list must also cover the old **ΕΛΠΕ / Ελληνικά Πετρέλαια** name. |
| **Cosmote** | ❌ drop | The only separable symbol is **Deutsche Telekom's magenta "T"** (parent co.), not a Cosmote-Greek mark — reads as "Telekom". Fails the master-brand-perceived-as-Greek test from the symbol angle. |
| **Public** | ○ manual | No clean public SVG; source from public.gr by hand. |

Preview of the PoC: `.claude/aiHelper/logopaignio-preview.html` (full logo vs. mark-only crop, side by side).

---

## Division of labour

**Agent can:** find source URLs (Wikimedia Commons, official brand kits, favicons); download via the fetch script; produce a mark-only crop when the SVG is layered; draft the accept-list from names; record sector + credit.

**Human must:** judge recognizability, confirm it's the current master brand still perceived as Greek, and accept/reject each candidate 1-by-1. Also: any manual raster crop, and brands with no public asset.

---

## Per-brand recipe (repeat at scale)

1. Pick a brand that passes the **icon-only filter** — if the logo *is* just the name in a typeface (pure wordmark), **drop the brand.**
2. Source its **mark-only asset** (app icon / favicon / brand-kit "symbol"), or crop the mark out of a layered logo; manual crop as fallback.
3. Write the **accept-list** — Greek form + Latin form + common variants (covers the `Cosmote`/`Κοσμοτέ` fork).
4. Record **sector** and **credit/source** (takedown readiness).
5. Human eye-check → approve or reject.

## Rules (locked in the grill — do not re-litigate)

- **Current logo only** — no old/rebrand versions (avoids "that's the old one" disputes).
- **Master/parent brand only** — no product-line sub-brands. *And beware the inverse (Cosmote): if the only separable mark belongs to a foreign parent, drop it.*
- **Foreign-owned allowed if still perceived as Greek** (Goody's, Chipita-era brands).
- **Defunct brands allowed** — nostalgia marks (Olympic Airways, retired ΟΤΕ/WIND marks) are a feature and help reach depth.
- **Scope of "Greek":** founded/HQ'd in Greece **and** recognizable to a general Greek audience. Excludes obscure B2B and foreign brands.
- **Matching is normalized + accept-list**, never character-exact (see the game's `evaluateGuess`): case/accent-insensitive, trimmed, plus the per-brand Greek⇄Latin accept-list.

## If the pool stalls before 150

Relax **"recognizable"** before you relax **"icon-only"**. Dropping the icon-only filter breaks the game (unguessable stripped wordmarks); dropping "must be a household name" just makes some days harder, which is acceptable once the core pool is solid. Defunct/nostalgia marks are the other lever to reach depth.

## Legal (the one thing that could kill the game post-launch)

Every hosted logo is someone's trademark/copyright — no clean open-data license story exists (unlike the map/price games). **Decision: ship anyway** as a hobby-game risk, **with** a `credit`/source recorded per asset and a fast takedown path. Wikimedia "Original file" pages give a clean license line (most are PD-textlogo, trademark noted) — prefer them as the source of record. Reassess if the game gets real traffic; the risk note belongs in `CONTEXT.md`/an ADR when the game graduates from wip.

---

## Seed candidate list (verify each has a separable non-text mark before including)

Organized by sector. **Not confirmed against the icon-only filter** — each needs mark-verification; some drop as wordmark-only or as borrowed-parent-mark (Cosmote).

- **Supermarkets:** ΑΒ Βασιλόπουλος (AB mark), My Market / Metro, Κρητικός, Γαλαξίας, Bazaar, Μασούτης, Χαλκιάδης.
- **Airlines / ferries:** Aegean Airlines ✅, Olympic Air / **Olympic Airways** (defunct — meander rings), Sky Express, Blue Star Ferries (star), Superfast Ferries, ANEK Lines, Minoan Lines, Hellenic Seaways, SeaJets, Attica Group.
- **Telecom / internet:** ~~Cosmote~~ (dropped — DT parent mark), OTE (ΟΤΕ), Nova, WIND (defunct/merged), Forthnet.
- **Banks / finance:** Εθνική Τράπεζα, Τράπεζα Πειραιώς, Alpha Bank ✅, Eurobank, Optima Bank, Attica Bank, Εθνική Ασφαλιστική, Interamerican.
- **Energy / fuel:** ΔΕΗ (PPC), ΕΚΟ (EKO — flame), HelleniQ Energy / ΕΛΠΕ ✅, Shell Hellas (skip if foreign-perceived), Coral, Avin, Jetoil, Aegean Oil.
- **Food / beverage / dairy:** ΔΕΛΤΑ, ΝΟΥΝΟΥ (mascot), Μέβγαλ, Όλυμπος, ΦΑΓΕ, Vikos, Λουξ (Loux), ΕΨΑ, Ήβη, 3E/Coca-Cola (skip foreign), Chipita / 7Days / Molto, Παπαδοπούλου, ΙΟΝ, Misko, Μέλισσα, Barba Stathis (Μπάρμπα Στάθης).
- **Fast food / cafe:** Goody's, Everest, Γρηγόρης, Coffee Island, Mikel, Flocafe.
- **Retail / electronics:** Public (○ manual), Kotsovolos, Πλαίσιο, Media Markt (skip if foreign), Praktiker, Leroy Merlin (skip foreign), Hondos Center, Jumbo (likely wordmark → verify).
- **Online / delivery:** Skroutz (bag mark), e-food (efood), BOX, Wolt (skip foreign), Car.gr, Spitogatos, XE.gr.
- **Betting / lottery:** ΟΠΑΠ, Stoiximan, Novibet, Pamestoixima.
- **Cosmetics / pharma:** Korres, Apivita, Frezyderm, Sarantis, Papoutsanis, Sesderma (skip foreign).
- **Industry / construction:** ΤΙΤΑΝ (Titan), Μυτιληναίος / Metlen, ΓΕΚ ΤΕΡΝΑ, Aktor, Alumil, ΕΛΒΑΛ.
- **Utilities / transport:** ΕΥΔΑΠ, ΕΥΑΘ, Hellenic Train / ΟΣΕ, ΣΤΑΣΥ, ΟΑΣΑ.

**Excluded for v1:** sports clubs (Olympiacos/ΠΑΟ etc. — clubs, not companies; possible later expansion pack), foreign brands merely popular in Greece.

Realistic yield after the icon-only filter is **~80–130** from this seed; the remainder to 150–200 comes from the long tail + defunct/nostalgia marks.

---

## Next actions

1. **Extend the fetcher** (`scripts/fetch-logopaignio-logos.mjs`) — walk the seed list sector-by-sector, sourcing Wikimedia/official URLs into `_raw/`, and generate the side-by-side preview (full logo + mark crop + draft accept-list + credit) for each batch.
2. **Batch eye-check** — human approves/rejects one-by-one from the preview.
3. **Graduate approved rows** into `src/data/logopaignio/puzzles-el.json` with their mark asset in `public/logopaignio/`, then flip `wip:false` once ~30 are live.
4. **Gitignore `_raw/`** so only finished marks ship (staging is not app content).

## Progress

- [ ] 30 (unlocks wip build)
- [ ] 60
- [ ] 100
- [ ] 150 (launch floor)
- [ ] 200 (comfortable)
