/**
 * Platform-level branding — single source of truth for the Platform's name.
 * See CONTEXT.md: the Platform is named "Leksarxeia". A future rebrand is a
 * one-line change here.
 */
import { GAME_REGISTRY, type RegistryGameId } from "./games";

/** The Platform's brand name, shown in the Shell header, picker, and metadata. */
export const PLATFORM_NAME = "Leksarxeia";

/** Game titles (excludes the community word-court and every `hidden` Game),
 *  derived from the registry.
 *
 *  The `hidden` filter is not cosmetic: this description is the string every
 *  share card, Open Graph tag and search result carries, so without it a Game
 *  that appears on NO player-facing surface (ADR 0022) is advertised on the
 *  most public surface there is. This file walks the whole registry — every
 *  other reader indexes one Game by id — which is why it needs its own filter
 *  rather than inheriting one. Guarded by registryCoverage.test.tsx, seam 1d. */
const gameTitles = (Object.keys(GAME_REGISTRY) as RegistryGameId[])
  .filter((id) => id !== "leksikastirio" && !GAME_REGISTRY[id].hidden)
  .map((id) => GAME_REGISTRY[id].title);

/** SEO meta description, derived from the registry so it never goes stale. */
export const PLATFORM_DESCRIPTION = `Ελληνικά παιχνίδια λέξεων: ${gameTitles.join(", ")}`;

/** Where the Platform is served from, as an absolute origin.
 *
 *  Only `metadataBase` needs this, and it needs it because Open Graph images
 *  must be absolute URLs — a relative one is rejected by most scrapers. It is
 *  read from Vercel's build-time environment rather than hardcoded so a custom
 *  domain is a DNS change, not a code change:
 *
 *    - production build  → the project's production domain
 *    - preview build     → that deployment's own URL, so a preview's card is
 *                          fetched from the preview and not from production
 *                          (which may not have the image yet)
 *    - local `next dev`  → localhost, where no scraper is looking anyway
 *
 *  The literal is the last resort only, and matches production today. */
export const PLATFORM_ORIGIN =
  process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://greek-bee.vercel.app";

// ── Data controller ───────────────────────────────────────────────────────────
// Who is answerable for players' personal data, and where they write to reach
// them. Used by /privacy (TICKET-07). Kept here rather than inline so a change of
// name or mailbox is one edit, and so the privacy page cannot drift from reality.
//
// CONTACT_EMAIL is rendered as PLAIN TEXT, never as a `mailto:` link — a hobby
// project's public address is scraper bait, and the page is read by humans.

/** The natural person answerable for the data this Platform holds. */
export const CONTROLLER_NAME = "Dimitris Dimitriadis";

/** Where players write about their data. A real mailbox — note this is NOT the
 *  Feedback form's recipient, which is a FormSubmit alias that only accepts form
 *  posts and cannot receive ordinary mail. */
export const CONTACT_EMAIL = "melkorinos@gmail.com";
