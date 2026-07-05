// POST /api/community-puzzles/leksindeseis — submit a community Leksindeseis puzzle.
// GET  /api/community-puzzles/leksindeseis?status=pending — list (admin only).
//
// Auth, insert, and list live in the Community Puzzle Lifecycle module; the
// validation adapter lives in the game's lib (validateLeksindeseisSubmission).
// This file only declares the config.

import { createListHandler, createSubmitHandler } from "@/lib/communityPuzzleLifecycle";
import { validateLeksindeseisSubmission } from "@/games/leksindeseis/lib/validateSubmission";

export const runtime = "edge";

const config = { table: "community_leksindeseis_puzzles", validate: validateLeksindeseisSubmission };

export const POST = createSubmitHandler(config);
export const GET  = createListHandler(config);
