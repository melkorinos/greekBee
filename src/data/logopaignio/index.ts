// Λογοπαίγνιο static data accessor.
//
// puzzles-el.json — one LogopaignioPuzzle per brand (name-stripped mark asset,
// accept-list, sector hint). Small and safe to ship to the client (the round
// needs the mark path + accept-list). A row graduates in only when its mark
// asset + accept-list are curated (handoff logopaignio-content-pool.md).
//
// Sample build: a single placeholder row until real brands are sourced.

import type { LogopaignioPuzzle } from "@/games/logopaignio/types";

import puzzlesJson from "./puzzles-el.json";

/** Every brand puzzle. */
export const LOGOPAIGNIO_PUZZLES = puzzlesJson as LogopaignioPuzzle[];
