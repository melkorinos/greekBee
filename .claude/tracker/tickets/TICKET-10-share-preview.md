# A share preview — the link has to look like something when it is posted

**Status:** ready
**Spec:** [.claude/handoffs/launch-readiness.md](../../handoffs/launch-readiness.md) — the launch checklist, line "Share preview"
**Claims re-verified against the code and against live production: 2026-08-12 (s150).** Two were
wrong and are corrected below — see *Corrections* at the end for what changed and why, before
trusting anything else in this file.

## Why

A soft launch is, concretely, a link posted somewhere. Today that link renders as bare underlined
text with no image, no card, and no title beyond the tab name.

`src/app/layout.tsx` sets `title` and `description` and nothing else — no `metadataBase`, no
`openGraph` block, no `twitter` block (verified 2026-08-12). There is no `opengraph-image`, no
`twitter-image`, no `icon.*` and no `apple-icon.*` in `src/app/`. Facebook, Messenger, WhatsApp,
Viber, Reddit and Slack all fall back to the ugliest possible rendering.

**There IS a favicon, and it is worse than none.** `src/app/favicon.ico` exists — 25,931 bytes,
added by `8e7e5e8 "Initial commit from Create Next App"` and never touched since. It is served in
production today (`200`, `<link rel="icon" … sizes="256x256">`), so tabs do not show a blank glyph:
**they show the Next.js logo.** A stranger's first impression of a Greek word-game platform is
another framework's branding.

**`PLATFORM_DESCRIPTION` already advertises the three hidden Games, and it is live right now.** This
is the defect that most affects the ticket, because the description is the string the scope below
tells you to reuse. `src/config/platform.ts` derives it from `GAME_REGISTRY` filtering **only**
`leksikastirio` — it never learned about `hidden`. Production is currently serving:

```
<meta name="description" content="Ελληνικά παιχνίδια λέξεων: Leksokipos, Leksiarxeio,
Leksindeseis, Vres Tin Frasi, Leksodromia, Leksoplegma, Stavrolekso, Topothesies,
Πόσο κάνει;, Λογοπαίγνιο"/>
```

Leksindeseis, Πόσο κάνει; and Λογοπαίγνιο are all `hidden: true` (ADR 0022) and appear on no
surface a player can reach — except this one. **`platform.ts` is a fourth enumerating surface that
`TICKET-06` missed**: the picker, the drawer, the Offline Mode set and `profile/page.tsx` all filter
on `hidden`, and `platform.ts` is the only file that walks the whole registry without doing so
(grepped 2026-08-12; every other `GAME_REGISTRY` reader indexes one game by id). This is the s148
lesson recurring — *a ticket's file list is a hypothesis, grep is the map* — and it is exactly the
hazard this ticket already warns about for the card image, sitting unnoticed in the text.

This is the highest ratio of first impression to effort on the entire launch checklist. Everything
else on that list prevents a bad outcome; this one is the only item that actively makes the launch
work better. It is also small — a metadata block and two images.

Greek-audience note: **Viber and Facebook Messenger matter more here than Twitter/X.** Test against
what the audience actually uses.

## Scope

- [ ] **Filter `hidden` out of `PLATFORM_DESCRIPTION` first** (`src/config/platform.ts`). Everything
      else here reuses that string, so fixing it afterwards means re-checking the card, the
      `openGraph` block and the `twitter` block. One added predicate beside the existing
      `leksikastirio` filter. **Check what depends on the exact text before changing it** — the
      privacy page and the picker read the registry too, and `PLATFORM_DESCRIPTION` may be asserted
      in the suite; grep, do not assume. Worth a guard test in the same breath: *the SEO description
      names no `hidden` Game*, which is the check that would have caught this.
- [ ] **`metadataBase`** in `layout.tsx`. Relative image paths in Next.js metadata resolve against
      it, and without it Open Graph URLs come out relative and most scrapers reject them. The
      production origin is `https://greek-bee.vercel.app` unless a custom domain has landed since —
      check before hardcoding, and prefer an environment-derived value over a literal. **Still
      `greek-bee.vercel.app` on 2026-08-12** (serving `200`; no custom domain configured).
- [ ] **An `openGraph` block** — title, description, locale `el_GR`, type `website`, plus the image.
      Reuse `PLATFORM_NAME` and `PLATFORM_DESCRIPTION` from `src/config/platform.ts` — the standing
      rule is never to hardcode a value that lives in `src/config/`. Reuse is right **once the first
      scope item has landed**: the derivation keeps it from going stale, but until `hidden` is
      filtered it also puts three unreachable Games into every shared card.
- [ ] **A `twitter` block** with `card: "summary_large_image"`. Cheap, and several non-Twitter
      scrapers read the Twitter tags in preference to Open Graph.
- [ ] **`src/app/opengraph-image`** — 1200×630. Either a static asset or Next's `ImageResponse`
      generator. Whichever is chosen, it must survive the eight-Game picker: **do not put the game
      emoji grid in it**. TICKET-06 shipped on 2026-08-12, so three Games are now `hidden` (ADR
      0022) and an emoji grid would advertise Games no surface links to. Prefer the Platform name
      and a single strong mark.
- [ ] **`src/app/icon`** and **`apple-icon`** — and **delete or overwrite `src/app/favicon.ico`**,
      which is the stock Create-Next-App file. Adding `icon.*` alongside it does not retire it:
      `/favicon.ico` is still requested directly by browsers and by several scrapers, so leaving
      the file means the Next.js logo keeps shipping from that path. Confirm by reading the rendered
      `<head>` **and** by requesting `/favicon.ico` on the deployed preview — not by trusting that
      the new file wins.
- [ ] Consider a `manifest.ts` while in the neighbourhood. **Optional** — decide, do not drift into
      building a PWA. Offline Mode is parked (`.claude/handoffs/offlineFeature-handoff.md`) and a
      manifest that implies installability it cannot deliver is worse than none.

## Design note

`.claude/aiHelper/html/` is the established place to render a visual decision and have the operator
look at it (the method s143 set for the badge marks). An Open Graph card is exactly that shape of
problem — **no test in this repo can tell a good card from a bad one.** Render the candidates there
before committing to one.

The UI redesign is being handled in separate sessions, so **do not treat this as licence to touch
`globals.css`, `recipes.ts` or any shared chrome.** The card is a standalone image; keep it that way.

## Done when

- [ ] **No `hidden` Game appears in the SEO description, the `openGraph` block or the card**, and a
      test locks it. Verify on the deployed preview's rendered HTML, not only in the unit suite.
- [ ] **`/favicon.ico` no longer serves the Create-Next-App icon** on the deployed preview.
- [ ] `opengraph-image`, `icon` and `apple-icon` exist and are referenced from the metadata.
- [ ] **The card is verified in a real scraper against a deployed preview URL** — not against
      localhost, and not by reading the HTML. Post the preview link into Messenger or Viber and look
      at it. This repo's standing rule is measure the artifact, not the response; a correct `<meta>`
      tag is the response, the rendered card is the artifact.
- [ ] The favicon shows in a browser tab.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` and `npm run test:e2e` clean (this
      touches `layout.tsx`, which every page renders through).

## Corrections — what s150 re-verified, 2026-08-12

Recorded rather than silently edited, because this ticket was written on 2026-08-11 and read as
verified for a day. Two claims were wrong:

| Claim as written | What is actually true |
|---|---|
| "there is no favicon at all today … browser tabs show a blank page glyph" | `src/app/favicon.ico` **exists and is served** — the stock Create-Next-App file from the initial commit. Tabs show the **Next.js logo**. The work is a replacement, not a first addition, and the old file must be removed rather than shadowed. |
| `PLATFORM_DESCRIPTION` "is already derived from the registry so it never goes stale" | True about staleness, **false about visibility**. It filters only `leksikastirio`, so it names all three `hidden` Games, and has been doing so in production since they were hidden on 2026-08-12. |

Everything else was checked and holds: `layout.tsx` has no `metadataBase` / `openGraph` / `twitter`
block; no `opengraph-image`, `twitter-image`, `icon.*`, `apple-icon.*`, `manifest`, `robots` or
`sitemap` exists in `src/app/`; `PLATFORM_NAME` and `PLATFORM_DESCRIPTION` live in
`src/config/platform.ts` as described; the production origin is unchanged.
