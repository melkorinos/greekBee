# A share preview — the link has to look like something when it is posted

**Status:** ready
**Spec:** [.claude/handoffs/launch-readiness.md](../../handoffs/launch-readiness.md) — the launch checklist, line "Share preview"

## Why

A soft launch is, concretely, a link posted somewhere. Today that link renders as bare underlined
text with no image, no card, and no title beyond the tab name.

`src/app/layout.tsx` sets `title` and `description` and nothing else — no `metadataBase`, no
`openGraph` block, no `twitter` block. There is no `opengraph-image`, no `twitter-image`, no `icon`
and no `apple-icon` file anywhere in `src/app/`. Facebook, Messenger, WhatsApp, Viber, Reddit and
Slack all fall back to the ugliest possible rendering.

This is the highest ratio of first impression to effort on the entire launch checklist. Everything
else on that list prevents a bad outcome; this one is the only item that actively makes the launch
work better. It is also small — a metadata block and two images.

Greek-audience note: **Viber and Facebook Messenger matter more here than Twitter/X.** Test against
what the audience actually uses.

## Scope

- [ ] **`metadataBase`** in `layout.tsx`. Relative image paths in Next.js metadata resolve against
      it, and without it Open Graph URLs come out relative and most scrapers reject them. The
      production origin is `https://greek-bee.vercel.app` unless a custom domain has landed since —
      check before hardcoding, and prefer an environment-derived value over a literal.
- [ ] **An `openGraph` block** — title, description, locale `el_GR`, type `website`, plus the image.
      Reuse `PLATFORM_NAME` and `PLATFORM_DESCRIPTION` from `src/config/platform.ts`; the standing
      rule is never to hardcode a value that lives in `src/config/`, and `PLATFORM_DESCRIPTION` is
      already derived from the registry so it never goes stale.
- [ ] **A `twitter` block** with `card: "summary_large_image"`. Cheap, and several non-Twitter
      scrapers read the Twitter tags in preference to Open Graph.
- [ ] **`src/app/opengraph-image`** — 1200×630. Either a static asset or Next's `ImageResponse`
      generator. Whichever is chosen, it must survive the eight-Game picker: **do not put the game
      emoji grid in it**. TICKET-06 shipped on 2026-08-12, so three Games are now `hidden` (ADR
      0022) and an emoji grid would advertise Games no surface links to. Prefer the Platform name
      and a single strong mark.
- [ ] **`src/app/icon`** and **`apple-icon`** — there is no favicon at all today, so browser tabs
      and phone home screens show a blank page glyph.
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

- [ ] `opengraph-image`, `icon` and `apple-icon` exist and are referenced from the metadata.
- [ ] **The card is verified in a real scraper against a deployed preview URL** — not against
      localhost, and not by reading the HTML. Post the preview link into Messenger or Viber and look
      at it. This repo's standing rule is measure the artifact, not the response; a correct `<meta>`
      tag is the response, the rendered card is the artifact.
- [ ] The favicon shows in a browser tab.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` and `npm run test:e2e` clean (this
      touches `layout.tsx`, which every page renders through).
