// PATCH /api/community-puzzles/leksindeseis/[id]/review
// Admin only — approve or reject a pending community Leksindeseis puzzle.
// approve → UPDATE status='approved' · reject → DELETE row
// Implementation: Community Puzzle Lifecycle module.

import { createReviewHandler } from "@/lib/communityPuzzleLifecycle";

export const runtime = "edge";

export const PATCH = createReviewHandler({ table: "community_leksindeseis_puzzles" });
