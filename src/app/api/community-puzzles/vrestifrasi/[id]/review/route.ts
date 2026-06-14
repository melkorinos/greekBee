// PATCH /api/community-puzzles/vrestifrasi/[id]/review
// Admin only — approve or reject a pending community Vres Tin Frasi phrase.
// approve → UPDATE status='approved' · reject → DELETE row
// Implementation: Community Puzzle Lifecycle module.

import { createReviewHandler } from "@/lib/communityPuzzleLifecycle";

export const runtime = "edge";

export const PATCH = createReviewHandler({ table: "community_vrestifrasi_puzzles" });
