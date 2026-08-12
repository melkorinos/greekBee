/**
 * Platform-level branding — single source of truth for the Platform's name.
 * See CONTEXT.md: the Platform is named "Leksarxeia". A future rebrand is a
 * one-line change here.
 */
import { GAME_REGISTRY, type RegistryGameId } from "./games";

/** The Platform's brand name, shown in the Shell header, picker, and metadata. */
export const PLATFORM_NAME = "Leksarxeia";

/** Game titles (excludes the community word-court), derived from the registry. */
const gameTitles = (Object.keys(GAME_REGISTRY) as RegistryGameId[])
  .filter((id) => id !== "leksikastirio")
  .map((id) => GAME_REGISTRY[id].title);

/** SEO meta description, derived from the registry so it never goes stale. */
export const PLATFORM_DESCRIPTION = `Ελληνικά παιχνίδια λέξεων: ${gameTitles.join(", ")}`;

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
