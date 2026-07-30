# Πόσο κάνει; — source real puzzle content

Status: ready-for-human

The game engine shipped in session 124 (`wip:true`) against a **single placeholder puzzle** (Αγγούρι + an authored SVG at `public/posokanei/sample.svg`). Before it can graduate to `wip:false` and reach the home grid, it needs real dated puzzles. This issue carries the still-pending sourcing work from the (now-deleted) `posoKanei.md` handoff — **git history keeps that handoff's full item list, gov API notes, and politeness rules**; the essentials are below.

## What a shippable puzzle row needs
A row graduates into `src/data/posokanei/puzzles-el.json` only with **photo + price + sourceStore + sourceDate + band** (schema = the `PosokaneiPuzzle` type). Never ship the copyrighted gov `image_url`.

## Reference price — Παρατηρητήριο Τιμών (gov.gr)
- Official Greek govt price observatory. Freeze values into our JSON at **build time** — never call it live at play time.
- Undocumented REST API verified live 2026-07-24: base `https://api.posokanei.gov.gr`; GET `/meta/categories`, `/products?category={id}`, `/products/{id}`, `/products/barcode/{barcode}`. Each product's `retailer_prices[]` has `price` + `retailer_display_name` + `last_updated`. Cite `Παρατηρητήριο Τιμών (gov.gr)`.
- The developer's manual browsing needs a **Greek VPN** (site geo-gates end users); Claude's WebFetch reaches it. Be gentle: sequential ~1 req/2s, back off on errors.
- TODO: check data.gov.gr for a formally-open republish (cleaner licensing).

## Photos
Priority: (1) open-license stock (Wikimedia Commons / Openverse / Pexels / Unsplash), (2) shoot-your-own, (3) **never** supermarket product photos.

## Commodity vs. packaged rule
- **Commodity** (produce by weight — αγγούρι, ντομάτα…): `itemType: generic`, no brand, generic photo, wider band (±15%). Price is brand-agnostic and honest.
- **Packaged** (γάλα, φέτα, ελαιόλαδο…): `itemType: specific` — **must name brand + size** and use that SKU's gov price, tighter band (±10%).

## Open design decision (unresolved)
Branded-item photo policy: shoot-your-own vs. brand-text-label + generic photo (never the copyrighted `image_url`). Decide before scaling the packaged rows.

## Path to go-live
3-item pilot (photo + price + date → JSON) → validate the pipeline → fill ~15–20 rows → flip `posokanei.wip:false` (registry) after an operator play-through.
