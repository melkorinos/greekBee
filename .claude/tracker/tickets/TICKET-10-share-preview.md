# A share preview — the link has to look like something when it is posted

**Status:** in-progress
**Spec:** [.claude/handoffs/launch-readiness.md](../../handoffs/launch-readiness.md) — the launch checklist, line "Share preview"
**Blocked by:** an operator decision — one card number and one icon number from
`.claude/aiHelper/html/share-card-candidates.html`. Nothing below the decision line can start
without it. Everything above it has shipped.

**Partly done on 2026-08-13 (s151), uncommitted on `dev` at the time of writing.** Read *What has
shipped* before touching anything: three of the eight scope items are done, and the two claims this
file was rewritten for in s150 are now fixed rather than pending.

## Why

A soft launch is, concretely, a link posted somewhere. Today that link renders as bare underlined
text with no image, no card, and no title beyond the tab name. This is the highest ratio of first
impression to effort on the entire launch checklist: everything else on that list prevents a bad
outcome, this is the only item that actively makes the launch work better.

Greek-audience note: **Viber and Facebook Messenger matter more here than Twitter/X.** Test against
what the audience actually uses.

## What has shipped (s151)

- [x] **`hidden` is filtered out of `PLATFORM_DESCRIPTION`** (`src/config/platform.ts`). It walked the
      whole registry filtering only `leksikastirio`, so from the day TICKET-06 hid three Games the
      `<meta name="description">` advertised Leksindeseis, Πόσο κάνει; and Λογοπαίγνιο to every
      scraper. Nothing in the suite asserted the description text (grepped) so no test needed
      rewriting.
- [x] **A guard test locks it** — `src/test/shared/registryCoverage.test.tsx`, **seam 1d**, using the
      same probe-Game trick as the drawer/picker/offline seams. Verified to fail without the fix, not
      just to pass with it. This is the fourth enumerating surface; the other three were already
      guarded.
- [x] **`metadataBase`, `openGraph` and `twitter` blocks** in `src/app/layout.tsx`, reusing
      `PLATFORM_NAME`/`PLATFORM_DESCRIPTION`. `openGraph` carries locale `el_GR`, type `website`,
      `url: "/"` and `siteName`; `twitter` carries `summary_large_image`. **The image files are
      deliberately NOT named in the metadata object** — Next's file conventions inject those tags
      from `src/app/`, and naming them twice is how they drift.
- [x] **`PLATFORM_ORIGIN` in `src/config/platform.ts`** — the absolute origin `metadataBase` needs,
      derived from Vercel's build environment (production domain → own preview URL → localhost), with
      `https://greek-bee.vercel.app` as the last-resort literal. A custom domain is now a DNS change,
      not a code change.
- [x] **A candidates page for the visual decision** at
      `.claude/aiHelper/html/share-card-candidates.html` — 25 cards at true 1200×630 and 12 icons at
      180/64/32/16, palette restricted to **dark grey, green, teal, yellow** on operator instruction,
      every card carrying the word-game signal in its shape (guess board, crossword, word-search,
      letter tiles, scoring tile, block mosaics) rather than a letter on a background.

`npm run test -- --run` (2469 passing), `npx eslint .` and `npm run build` were all clean after these.

## The blocking decision

The operator picks **one card number and one icon number** from the candidates page. Until then the
remaining scope cannot be built, because every remaining item is that image in a different size.

Two facts the picker needs, both already stated on the page itself:

1. **The generator ships one font, and it covers six Greek letters: Λ Ω λ μ π ω.** No accents, no
   final ς. A card with real Greek words therefore costs a font file committed to the repo (~350 KB)
   and loaded in the generator — that is card 8's price and nobody else's. Latin text, those six
   glyphs, and digits are free. The Greek description still reaches the reader regardless:
   Messenger, Viber and Facebook print `og:description` as text beneath the image.
2. **Λ is the mark** in most candidates — the platform's own initial and one of the six free glyphs.
   Several icons (3, 4, 7, 8, 11) use no letter at all and escape the constraint entirely.

## Remaining scope

- [ ] **`src/app/opengraph-image.tsx`** — 1200×630 via `ImageResponse` from `next/og` (built into
      Next 16, no new dependency). Rebuild the chosen card; the candidates are drawn in the same
      flexbox subset satori understands, so the translation is mechanical. **Do not put the game
      emoji grid in it** — three Games are `hidden` (ADR 0022) and a grid would advertise Games no
      surface links to.
- [ ] **`src/app/icon.tsx`** and **`src/app/apple-icon.tsx`** — the chosen icon at 32×32 and 180×180.
- [ ] **Delete `src/app/favicon.ico`.** It is the stock Create-Next-App file (25,931 bytes, from
      `8e7e5e8`, never touched) and it is **served in production today**, so tabs currently show the
      Next.js logo. Adding `icon.*` alongside it does not retire it: `/favicon.ico` is still
      requested directly by browsers and several scrapers. Confirm by requesting `/favicon.ico` on
      the deploy, not by trusting that the new file wins.
- [ ] **A test that the metadata block survives.** Seam 1d covers the description; nothing yet
      asserts that `openGraph`/`twitter` exist and reuse the config values.
- [ ] Consider a `manifest.ts` while in the neighbourhood. **Optional** — decide, do not drift into
      building a PWA. Offline Mode is parked (`.claude/handoffs/offlineFeature-handoff.md`) and a
      manifest implying installability it cannot deliver is worse than none.

## Done when

- [ ] `opengraph-image`, `icon` and `apple-icon` exist and their tags appear in the rendered `<head>`.
- [ ] **`/favicon.ico` no longer serves the Create-Next-App icon** on the deploy.
- [ ] The favicon shows in a browser tab.
- [ ] **The card is verified in a real scraper** — post the link into Messenger or Viber and look at
      it. Measure the artifact, not the response: a correct `<meta>` tag is the response, the
      rendered card is the artifact.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` and `npm run test:e2e` clean (this
      touches `layout.tsx`, which every page renders through).

## The verification trap — read before planning the deploy

The original done-when said *verify against a deployed preview*. **That cannot work.** Vercel
previews on this project are SSO-protected and answer 302 to anyone unauthenticated (recorded in
memory.md's error-monitoring row, found in s150). Facebook's and Viber's scrapers carry no session,
so they cannot fetch a preview's card at all — they will render the login page or nothing.

Two options, both the operator's call:

1. Verify on **production** after the deploy, accepting that a bad card is briefly live.
2. Turn **deployment protection off** for one preview deploy, verify, turn it back on.

`PLATFORM_ORIGIN` already handles either: a preview build points `metadataBase` at its own URL rather
than at production, so an unprotected preview tests its own image rather than production's.

## Notes for whoever picks this up

- The candidates page is **static HTML with no JavaScript**, on purpose — the operator reads these on
  an iPhone, where iOS Quick Look renders HTML and CSS but runs no scripts. Every page under
  `.claude/aiHelper/html/` was converted to that shape in s151, and the three generators in
  `scripts/` that emit such pages were patched to keep emitting it. If you regenerate the candidates
  page, pre-render it — do not ship a page that builds itself.
- The design note from the original ticket still stands: **no test in this repo can tell a good card
  from a bad one**, which is why the decision is rendered and looked at rather than asserted.
- The UI redesign is handled in separate sessions. **Do not treat this ticket as licence to touch
  `globals.css`, `recipes.ts` or any shared chrome.** The card is a standalone image; keep it that way.
