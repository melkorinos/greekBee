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
