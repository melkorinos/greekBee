// POST /api/community-puzzles/stavrolekso — submit a new community crossword.
// GET  /api/community-puzzles/stavrolekso?status=approved — public approved list (landing page).
// GET  /api/community-puzzles/stavrolekso?status=pending  — admin list (X-Admin-Secret required).
//
// Auth, insert, and list live in the Community Puzzle Lifecycle module; the
// validation adapter lives in the game's lib (validateStavroleksoSubmission),
// shared with the creator-edit route and the maker's pre-flight checks.
// Unlike the other games, approved rows are never consumed: the approved list
// is public, newest-first, and POST echoes the new row id for the creator's
// edit URL. Creator edit (PIN-gated PATCH) is a Stavrolekso-only route: see
// [id]/route.ts.

import { createListHandler, createSubmitHandler } from "@/lib/communityPuzzleLifecycle";
import type { CommunityPuzzleGameConfig } from "@/lib/communityPuzzleLifecycle";
import { validateStavroleksoSubmission } from "@/games/stavrolekso/lib/validateSubmission";

export const runtime = "edge";

const config: CommunityPuzzleGameConfig = {
  table:              "community_stavrolekso_puzzles",
  validate:           validateStavroleksoSubmission,
  select:             "id, title, submitter_name, data, status, created_at",
  listOrder:          "desc",
  publicApprovedList: true,
  returnInsertedId:   true,
};

export const POST = createSubmitHandler(config);
export const GET  = createListHandler(config);
