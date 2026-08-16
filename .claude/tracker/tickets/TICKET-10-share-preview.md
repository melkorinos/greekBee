# A share preview — the link has to look like something when it is posted

**Status:** in-progress
**Spec:** [.claude/handoffs/launch-readiness.md](../../handoffs/launch-readiness.md) — the launch checklist, line "Share preview"
**Blocked by:** nothing in code — **every scope item is built.** The operator chose **card 18 and
icon 1** on 2026-08-16 and both shipped the same session. What is left is an operator action that no
agent can take: deploy, then look at the card in a real scraper. Read *The verification trap* below
first — it rules out the obvious way of doing that.

**This ticket owned the platform logo, and discharged it (operator ruling 2026-08-15, settled
2026-08-16).** The logo was the last untracked launch item and it sat outside every file, blocking
this ticket from a distance. The ruling was that it is not a separate design project — the icon
picked here **is** the platform mark, with no second surface waiting on a different one. The
operator picked icon 1 and it shipped as `src/app/_brand/fan.tsx`. Consequences that outlive the
pick:

- There was never a "placeholder logo, revisit later" branch, and there is no placeholder now.
- A richer mark, if ever wanted, is new work against a shipped icon — not a launch blocker.
- `launch-readiness.md` does not list the logo. Do not re-file it there.

**Read the two *What shipped* sections before touching anything.** This ticket ran in three passes —
the metadata half in s151, the round-two candidates page and the pick in s160, and the images in the
same session — so almost everything the older prose describes as pending is done.

## Why

A soft launch is, concretely, a link posted somewhere. **In production today that link still renders
as bare underlined text** with no image, no card, and no title beyond the tab name — the fix is
built and sitting on `dev`, so this stays true until the deploy and not a day longer. This is the
highest ratio of first impression to effort on the entire launch checklist: everything else on that
list prevents a bad outcome, this is the only item that actively makes the launch work better.

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
      `.claude/aiHelper/html/share-card-candidates.html` — round one carried 25 cards at true
      1200×630 and 12 icons at 180/64/32/16, palette restricted to **dark grey, green, teal, yellow**
      on operator instruction, every card carrying the word-game signal in its shape rather than a
      letter on a background. **Round one is deleted, not archived** — the operator picked card 18
      from it and the other 24 are git history. A Lockups section joined it 2026-08-15.
- [x] **Round two of the page (2026-08-16)** — rebuilt around card 18: the card as picked plus three
      variations (**18a** warmer `#292524` ground, **18b** on white, **18c** tighter gap so a
      square crop keeps tiles and wordmark), then **eight icons derived from the fan**, each at
      180/64/32/16, then lockups for all eight. **It adds no third pick:** the lockup follows
      whichever icon is chosen. Every mark is authored **once at 180 px and scaled by transform** to
      64/32/16 and to the 44 px lockup, so no size can drift from another. The page states the
      16 px problem plainly, because that is where the icon decision actually lives: three tiles
      carrying three letters is more than a dense favicon can hold, so icons 2/6/7 give up the
      flanking letters and 3/4 give up the fan.
- [x] **The page is now the decision record, not the question (same day).** Card 18 and icon 1 carry
      a `CHOSEN — SHIPPED` flag and a yellow ring; the header, both notes and the closing block say
      what shipped and what is still open. **The alternatives are deliberately kept** — a mark is
      re-read in context far more often than it is re-picked, and burying the options it beat makes
      the record worse. Nothing on the page asks for a reply any more.

`npm run test -- --run` (2469 passing), `npx eslint .` and `npm run build` were all clean after these.

## The decision, made 2026-08-16

**Card 18 and icon 1**, both the base option: three tiles fanned out on a near-black ground —
green Ω, yellow Λ, teal π — with the wordmark beneath on the card, and the same fan squared off for
the icon. The three card variations (18a/18b/18c) were not taken.

Two facts that survive the pick and should not be rediscovered:

1. **The font constraint costs this mark nothing.** The generator ships one font covering six Greek
   letters — Λ Ω λ μ π ω, no accents, no final ς — and Ω Λ π are all three inside it. No font file,
   no commit. `shareMetadata.test.ts` now pins this against `fan.tsx`'s own `letter:` fields, so a
   seventh glyph fails the suite rather than rendering an empty tile. The Greek description reaches
   the reader either way: Messenger, Viber and Facebook print `og:description` beneath the image.
2. **16 px is where the icon decision lived.** Three tiles carrying three letters is more than a
   dense tab favicon can hold, and icon 1 is the option that keeps every letter anyway. Taken
   knowingly. Icon 2 — the same fan without the flanking letters — remains a one-line change to
   `fan.tsx` if the tab icon is ever wanted cleaner.

## What shipped on the pick (s160, 2026-08-16)

- [x] **`src/app/_brand/fan.tsx` — the mark, drawn once.** The card and both icons render this one
      module at different sizes, so a favicon cannot drift from the share card. Two satori
      constraints are encoded in it and both are load-bearing: the centre tile is emitted **last**
      because satori honours **paint order, not `z-index`**, and the tile letters are checked
      against the six free glyphs by a test. The `_` prefix keeps Next from routing the folder.
- [x] **`src/app/opengraph-image.tsx`** — card 18 at 1200×630 via `ImageResponse`. No emoji grid
      (ADR 0022). No game metadata of any kind.
- [x] **`src/app/icon.tsx` (32) and `src/app/apple-icon.tsx` (180)** — icon 1, the full fan.
      `apple-icon` passes corner radius **0** on purpose: iOS applies its own mask, so a pre-rounded
      image renders as a rounded square inside a rounded square with its transparent corners
      showing. That is a platform requirement, not a change to the pick.
- [x] **`src/app/favicon.ico` deleted** — verified first as the untouched stock file (25,931 bytes,
      last and only touch `8e7e5e8`, "Initial commit from Create Next App").
- [x] **`src/test/shared/shareMetadata.test.ts`** — 10 tests. The three images are **actually
      rendered** and the PNG header inspected, not text-matched: the realistic failure is a card that
      renders blank because a glyph is outside the shipped font, and no source match can see that.
      Plus the `layout.tsx` contracts that have no visible output — reuses the config values, and
      does **not** name the image files.
- [x] **`src/test/setup.ts` no longer assumes jsdom.** The DOM stubs are behind one `typeof window`
      check. `ImageResponse` hands satori's SVG to sharp, which throws `Unsupported input` under
      jsdom, so the new test opts into the `node` environment — and an unguarded `Element` in the
      global setup threw before a single test could collect.
- [x] **`manifest.ts`: decided against, not deferred.** Offline Mode is parked
      (`.claude/handoffs/offlineFeature-handoff.md`), and a manifest advertising installability the
      Platform cannot deliver is worse than no manifest. Revisit only if Offline Mode revives.

`npm run test -- --run` (202 files / 2637 tests), `npx eslint .`, `npm run build` and
`npm run test:e2e` (13 passed / 2 skipped — the recorded baseline) were all clean. The build reports
`/opengraph-image`, `/icon` and `/apple-icon` as **`○ (Static)`**, so all three are prerendered and
served from the CDN rather than costing a Fluid invocation per scrape.

## Two things the render showed that the preview could not

Both were found by generating the real PNGs and looking at them. Neither is a defect; both are
operator calls that cost nothing to leave alone.

1. **The card rendered regular, not bold — found, then fixed the same session.** Every candidate was
   drawn `font-weight: 700`, but the face `ImageResponse` bundles has **one weight**, so the mark
   shipped light. **The ticket's own price tag was what made this look expensive:** "~350 KB" was
   full Greek coverage, and the mark needs six Greek glyphs plus a Latin wordmark. Operator approved
   the subset; it is **12 KB**, `src/app/_brand/Inter-Bold-subset.ttf`, cut by the Google Fonts
   `text=` parameter to the Latin alphabet plus Λ Ω λ μ π ω. Measured alternatives, since the choice
   is not obvious: 11 glyphs (exactly what is drawn) is 3.4 KB, Latin + the six Greek is 12 KB,
   adding digits and punctuation is 32 KB. **The 3.4 KB build is the trap** — `PLATFORM_NAME` is a
   config value whose comment invites a rebrand, and a character with no glyph renders as *nothing*.
   `_brand/cmap.ts` + a test now read the font's own `cmap` so that fails loudly instead.
2. **At 32 px the three letters are noise.** Expected — the candidates page said so and icon 1 was
   picked knowing it. Worth knowing that the rendered 32 px is a little muddier than the scaled
   preview suggested. Icon 2 (the same fan without the flanking letters) is a one-line change to
   `fan.tsx` if the tab icon ever wants to be cleaner.

## Done when

- [x] `opengraph-image`, `icon` and `apple-icon` exist and their tags appear in the rendered `<head>`.
- [x] `npm run test -- --run`, `npx eslint .`, `npm run build` and `npm run test:e2e` clean.
- [ ] **`/favicon.ico` no longer serves the Create-Next-App icon** on the deploy. The file is gone
      from the repo, but confirm by **requesting `/favicon.ico` on the deploy** — browsers and
      several scrapers ask for that path directly whatever the `<link>` tag says.
- [ ] The favicon shows in a browser tab.
- [ ] **The card is verified in a real scraper** — post the link into Messenger or Viber and look at
      it. Measure the artifact, not the response: a correct `<meta>` tag is the response, the
      rendered card is the artifact.

The three open boxes are all one operator action — deploy, then look — and the section below is why
that is less obvious than it sounds.

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
  page, pre-render it — do not ship a page that builds itself. **Its generator is deliberately not
  committed** (neither round's was): it is a one-off that dies with the pick, and `scripts/` is for
  things the repo runs again.
- The design note from the original ticket still stands: **no test in this repo can tell a good card
  from a bad one**, which is why the decision is rendered and looked at rather than asserted.
- The UI redesign is handled in separate sessions. **Do not treat this ticket as licence to touch
  `globals.css`, `recipes.ts` or any shared chrome.** The card is a standalone image; keep it that way.
