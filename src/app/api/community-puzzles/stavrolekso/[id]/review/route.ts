// PATCH /api/community-puzzles/stavrolekso/[id]/review
// Admin only — approve or reject a pending community Stavrolekso puzzle.
// approve → UPDATE status='approved' (permanent) · reject → DELETE row
// Implementation: Community Puzzle Lifecycle module.

import { createReviewHandler } from "@/lib/communityPuzzleLifecycle";

export const runtime = "edge";

export const PATCH = createReviewHandler({ table: "community_stavrolekso_puzzles" });
