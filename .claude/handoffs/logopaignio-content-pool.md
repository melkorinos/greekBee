# Handoff: Λογοπαίγνιο — content pool (source, curate, grow to 150–200)

**Date:** 2026-07-27 (updated after the bulk-sourcing session; folds in the former `logopaignio.md` design spec)
**Status:** Game code shipped (`wip:true`, single placeholder). **Sourcing is now largely done — 144/159 candidates have a downloaded asset.** The remaining work is human curation, not fetching.
**Goal:** Curate real puzzles up to **150–200** brands so the daily rotation doesn't repeat for months. First **~30** unlocks a proper wip build; 150 is the launch floor.
**Owner:** Human-led with agent assist.

---

## Where this stands

| | Count |
|---|---|
| Candidate brands in the seed list | **159** |
| With a downloaded asset | **144** |
| — from Wikimedia Commons | 68 |
| — from official sites (Plan B) | 68 |
| — from Google favicon cache (Plan C) | 8 |
| Without an asset (see "The 15") | 15 |
| Cards clean / flagged in the preview | 71 / 73 |

**Nothing has been approved yet.** Every asset is in gitignored staging (`public/logopaignio/_raw/`); `puzzles-el.json` still holds only the fake «Δείγμα» placeholder. The eye check is the next human step.

**Review surface:** `.claude/aiHelper/logopaignio-preview.html` — 159 cards grouped by sector, with filter buttons (Όλα / Καθαρά / Με προειδοποίηση / Προβληματικά / Χωρίς αρχείο). Regenerate with `npm run logopaignio:preview`.

---

## The pipeline (three commands)

```
npm run logopaignio:fetch      # Commons pass  → _raw/ + manifest.json
npm run logopaignio:official   # Plan B (official sites) + Plan C (Google favicons)
npm run logopaignio:preview    # renders the eye-check page from the manifest
```

Data files:
- `scripts/lib/logopaignio/seedBrands.mjs` — the 159 candidates (id, brand, sector, accept-list, Commons search terms)
- `scripts/lib/logopaignio/officialSites.mjs` — 92 domain mappings for Plan B
- `public/logopaignio/_raw/manifest.json` — machine-readable result of every attempt (gitignored)

All three scripts merge into the same manifest, so `--only <ids>` re-runs a subset without losing earlier results. A failed re-fetch never overwrites a good row.

---

## Decisions made this session (do not silently revert)

**Greek-origin rule DROPPED.** The pool is now *"brands a Greek audience recognizes"*, regardless of origin — DHL, Revolut, Sprite, Fanta, Pepsi, Wolt, Groupama, Lidl et al. are in scope. Recognizability is still required. The icon-only filter is untouched and remains the rule that actually keeps the game playable.

**Sector merges.** «Ταχυδρομείο» + «Ταχυμεταφορές» → **Delivery**; «Ακτοπλοΐα» + «Μεταφορές» → one **Μεταφορές**. Sector is the in-game free hint, so fewer/fatter categories give away less.

**Εστίαση is deferred** — banner-marked TODO in the preview (amber header, dimmed cards). Skip it during the eye check.

**Mark canvas: 512×512 square**, mark centred, 12% padding — recorded in `src/config/gameRules.ts` as `LOGOPAIGNIO.MARK_CANVAS_PX` / `MARK_PADDING_RATIO`.

> Why square, and why it matters beyond looks: the three PoC crops came out at ratios **1.00 / 1.00 / 0.74**, while the full logos they came from were **4.53 / 3.48 / 4.89** wide — the extreme widths belong to the *wordmark*, which the crop removes. And `BLUR_STEP_RADII_PX` is in **fixed pixels**, so on an un-normalised pool the same 16px first look *erases* a thin 11:1 strip while barely hazing a large square. Un-normalised assets make difficulty depend on a logo's shape rather than on how recognizable it is.

**Skipped deliberately:** «Candia (αυτοκινητοβιομηχανία)» (Candia is a dairy brand; the carmaker was Namco) and «Dekagro» (no public presence).

---

## What the scripts flag automatically (and why to trust the flags)

Commons search ranks by text relevance and has no idea which country or company you mean. Blind "first hit" returned confident nonsense: **ΔΕΗ → "Namibia Power Corporation"**, **Κρι Κρι → an Indonesian hospital** (1.35 MB), **ΣΤΑΣΥ → a Lithuanian choir competition**, **MAD TV → *Mad Men***, **Cosmos Aluminium AND Αλουμίνιον της Ελλάδος → both got ETEM's logo**.

So the fetcher now requires a distinctive token from the brand's own accept-list to appear in the file title, and flags failures as **SUSPECT** (red card). It over-flags on purpose — `ote` and `ert` are false alarms (correct files, Latin-cased titles vs Greek accept-lists). A wrong flag costs one glance; a missed one poisons the pool.

Still flagged suspect, needing your verdict: `dei`, `kri-kri`, `stasy`, `forthnet` (genuinely wrong) and `ote`, `ert` (false alarms).
One real duplicate remains: **nova / forthnet** point at the same Commons file — at least one is wrong.

Other automatic checks: HTML-error-pages-saved-as-images are rejected (this bit once — `geniki-taxydromiki` saved a whole error page as `logo.svg`); raster assets under 64px are rejected; Plan C's floor is 128px because Google answers a *miss* with a 16×16 globe at status 200, never a 404. Favicon `sizes` attributes lie and are never trusted — apivita.com advertises a 1024×1024 icon that 404s, eydap.gr's "favicon.png" is 16×16, olympos.gr's "192" icon is really 32×32.

---

## The 15 without an asset

These are **anti-bot defences and dead infrastructure, not sourcing gaps** — automated scraping has genuinely hit its limit. They need manual sourcing.

| Cause | Brands |
|---|---|
| Domain does not resolve at all | `allatini`, `chalyvourgia`, `estia`, `naupigeia-elefsinas`, `pelargos`, `evropi-asfalistiki`, `ivi` |
| Blocked (403 / 502) | `golden-star-ferries`, `orizon`, `euroins` |
| Serves a JS shell with no logo in the HTML | `elval` (961 B), `notos-galleries` (88 B), `grigoris` |
| Redirects to an unrelated company | `coral` (→ netcare.gr) |
| Only a 32×32 icon available | `olympos` |

`ivi` and `jetoil` are defunct brands, so a dead domain is expected — Jetoil was nonetheless recovered from Google's cache. Their rows are left pointing at the dead hosts on purpose, so a future session sees them as attempted-and-dead rather than never-tried.

---

## Next actions

1. **Batch eye-check** the 159 cards. For each: is this the right company, and does it have a separable non-text symbol? Pure wordmarks are **rejected** — the icon-only filter is what keeps the game playable.
2. **Strip the wordmarks.** Many assets are the *full* logo, name included. Deferred this session; it is the main remaining craft work. Layered SVGs (84 of 144) can often be cropped by clipping the `viewBox` alone; the 60 PNG/JPGs need a manual crop.
3. **Normalise approved marks** onto the 512×512 canvas (script not yet written — mechanical, no per-brand judgment).
4. **Graduate approved rows** into `src/data/logopaignio/puzzles-el.json` with their mark in `public/logopaignio/`, then flip `wip:false` once ~30 are live.
5. **Manual-source the 15** (and re-check the 6 suspect cards) if the pool needs them to clear 150.

---

## Rules (locked in the grill — do not re-litigate)

- **Current logo only** — no old/rebrand versions.
- **Master/parent brand only** — no product-line sub-brands. *And beware the inverse (Cosmote): if the only separable mark belongs to a foreign parent, drop it.*
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

*Sourcing is ahead of curation: 144 assets are staged, 0 approved. The bottleneck is now entirely the eye check + wordmark stripping.*
