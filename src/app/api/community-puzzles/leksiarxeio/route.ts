// POST /api/community-puzzles/leksiarxeio — submit a community Leksiarxeio puzzle.
// GET  /api/community-puzzles/leksiarxeio?status=pending — list (admin only).
//
// A submission carries one word per length (4–8), validated against each Word Pool.
// All 5 lengths are required; if any word is not in its pool the whole submission
// is rejected with per-word errors so the player can fix or nominate the word.
//
// Auth, insert, and list live in the Community Puzzle Lifecycle module —
// this file owns only the Leksiarxeio validation adapter.

import { createListHandler, createSubmitHandler } from "@/lib/communityPuzzleLifecycle";
import type { SubmissionValidation } from "@/lib/communityPuzzleLifecycle";
import { getValidWords } from "@/data/leksiarxeio";
import { normalizeLetters } from "@/lib/normalize";
import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";

export const runtime = "edge";

const LENGTHS: LeksiarxeioLength[] = [4, 5, 6, 7, 8];

interface SubmitPayload {
  submitter_name?: string;
  words: Record<string, string>; // {"4": "word", "5": "word", ...}
}

function validate(body: unknown): SubmissionValidation {
  const { submitter_name = "", words } = (body ?? {}) as SubmitPayload;

  if (!words || typeof words !== "object") {
    return { ok: false, status: 400, body: { error: "words is required" } };
  }

  // Validate all 5 lengths are present and in their Word Pool
  const errors: Record<string, string> = {};
  for (const len of LENGTHS) {
    const word = normalizeLetters((words[String(len)] ?? "").trim());
    if (!word) {
      errors[String(len)] = "Απαιτείται λέξη";
      continue;
    }
    const pool = getValidWords(len);
    if (!pool.includes(word)) {
      errors[String(len)] = "Η λέξη δεν βρίσκεται στη λίστα";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, status: 422, body: { errors } };
  }

  const data = Object.fromEntries(
    LENGTHS.map((len) => [String(len), normalizeLetters((words[String(len)] ?? "").trim())])
  );

  return { ok: true, row: { submitter_name: submitter_name.trim(), data } };
}

const config = { table: "community_leksiarxeio_puzzles", validate };

export const POST = createSubmitHandler(config);
export const GET  = createListHandler(config);
