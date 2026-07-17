// POST /api/community-puzzles/vrestifrasi — submit a community phrase.
// GET  /api/community-puzzles/vrestifrasi?status=pending — list (admin only).
//
// Auth, insert, and list live in the Community Puzzle Lifecycle module; the
// validation adapter lives in the game's lib (validateVresTinFrasiSubmission)
// and is imported only here, so its word-pool imports stay out of the other
// games' edge bundles. This file only declares the config.

import {
  createListHandler,
  createSubmitHandler,
  type CommunityPuzzleGameConfig,
} from "@/lib/communityPuzzleLifecycle";
import { validateVresTinFrasiSubmission } from "@/games/vrestifrasi/lib/validateSubmission";

export const runtime = "edge";

const config: CommunityPuzzleGameConfig = {
  table:    "community_vrestifrasi_puzzles",
  validate: validateVresTinFrasiSubmission,
};

export const POST = createSubmitHandler(config);
export const GET  = createListHandler(config);
