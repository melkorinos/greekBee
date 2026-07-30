// Πόσο κάνει; static data accessor.
//
// puzzles-el.json — one PosokaneiPuzzle per dated puzzle (item, brand/size,
// frozen reference price, photo, source). Small and safe to ship to the client
// (the round needs the target's price + band + photo). Prices are FROZEN at
// build time — the game never calls the gov price observatory at play time
// (handoff posoKanei.md).
//
// Sample build: a single placeholder row until real content is sourced.

import type { PosokaneiPuzzle } from "@/games/posokanei/types";

import puzzlesJson from "./puzzles-el.json";

/** Every dated puzzle. */
export const POSOKANEI_PUZZLES = puzzlesJson as PosokaneiPuzzle[];
