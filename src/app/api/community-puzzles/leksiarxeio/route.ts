// POST /api/community-puzzles/leksiarxeio — submit a community Leksiarxeio puzzle.
// GET  /api/community-puzzles/leksiarxeio?status=pending — list (admin only).
//
// Auth, insert, and list live in the Community Puzzle Lifecycle module; the
// validation adapter lives in the game's lib (validateLeksiarxeioSubmission)
// and is imported only here, so its Word Pool imports stay out of the other
// games' edge bundles. This file only declares the config.

import {
  createListHandler,
  createSubmitHandler,
  type CommunityPuzzleGameConfig,
} from "@/lib/communityPuzzleLifecycle";
import { validateLeksiarxeioSubmission } from "@/games/leksiarxeio/lib/validateSubmission";

export const runtime = "edge";

const config: CommunityPuzzleGameConfig = {
  table:    "community_leksiarxeio_puzzles",
  validate: validateLeksiarxeioSubmission,
};

export const POST = createSubmitHandler(config);
export const GET  = createListHandler(config);
