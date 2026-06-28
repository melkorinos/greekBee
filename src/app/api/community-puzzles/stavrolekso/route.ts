// POST /api/community-puzzles/stavrolekso — submit a new community crossword.
// GET  /api/community-puzzles/stavrolekso?status=approved — public approved list (landing page).
// GET  /api/community-puzzles/stavrolekso?status=pending  — admin list (X-Admin-Secret required).
//
// Auth, insert, and list live in the Community Puzzle Lifecycle module —
// this file owns only the Stavrolekso validation adapter. Unlike the other
// games, approved rows are never consumed: the approved list is public,
// newest-first, and POST echoes the new row id for the creator's edit URL.
// Creator edit (PIN-gated PATCH) is a Stavrolekso-only route: see [id]/route.ts.

import { createListHandler, createSubmitHandler } from "@/lib/communityPuzzleLifecycle";
import type { CommunityPuzzleGameConfig, SubmissionValidation } from "@/lib/communityPuzzleLifecycle";
import type { StavroleksoPuzzleData } from "@/games/stavrolekso/types";
import { STAVROLEKSO } from "@/config/gameRules";

export const runtime = "edge";

interface SubmitPayload {
  title?: string;
  submitter_name?: string;
  edit_pin: string;
  data: StavroleksoPuzzleData;
}

function validate(body: unknown): SubmissionValidation {
  const { title, submitter_name = "", edit_pin, data } = (body ?? {}) as SubmitPayload;

  if (!edit_pin || typeof edit_pin !== "string" || !/^[a-zA-Z0-9]{4,8}$/.test(edit_pin)) {
    return { ok: false, status: 400, body: { error: "edit_pin must be 4–8 alphanumeric characters" } };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, status: 400, body: { error: "data is required" } };
  }

  if (!(STAVROLEKSO.VALID_GRID_SIZES as readonly number[]).includes(data.width) || data.width !== data.height) {
    return { ok: false, status: 400, body: { error: "Grid must be square: 9×9, 13×13, or 15×15" } };
  }

  if (!Array.isArray(data.slots) || data.slots.length === 0) {
    return { ok: false, status: 400, body: { error: "Puzzle must have at least one slot" } };
  }

  const hasAcross = data.slots.some((s) => s.direction === "across");
  const hasDown   = data.slots.some((s) => s.direction === "down");
  if (!hasAcross || !hasDown) {
    return { ok: false, status: 400, body: { error: "Puzzle must have at least one Οριζόντια and one Κάθετα slot" } };
  }

  return {
    ok:  true,
    row: {
      title:          title?.trim() ?? null,
      submitter_name: submitter_name.trim(),
      edit_pin,
      data,
    },
  };
}

const config: CommunityPuzzleGameConfig = {
  table:              "community_stavrolekso_puzzles",
  validate,
  select:             "id, title, submitter_name, data, status, created_at",
  listOrder:          "desc",
  publicApprovedList: true,
  returnInsertedId:   true,
};

export const POST = createSubmitHandler(config);
export const GET  = createListHandler(config);
