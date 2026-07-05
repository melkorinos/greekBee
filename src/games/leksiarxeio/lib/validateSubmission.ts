// validateSubmission — the Leksiarxeio Community Puzzle validation adapter.
//
// A submission carries one word per Length (4–8), each validated against its
// Word Pool. All 5 lengths are required; if any word is not in its pool the
// whole submission is rejected with per-word errors so the player can fix or
// nominate the word.
//
// Deliberately NOT exported from the lib barrel: the Word Pool imports behind
// getValidWords are heavy, and this module must only ever be pulled in by the
// Leksiarxeio submission route (and tests) — never by client bundles.

import type { SubmissionValidation } from "@/lib/communityPuzzleLifecycle";
import { getValidWords } from "@/data/leksiarxeio";
import { normalizeLetters } from "@/lib/normalize";
import { LEKSIARXEIO } from "@/config/gameRules";
import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";

const LENGTHS: LeksiarxeioLength[] = [...LEKSIARXEIO.LENGTHS];

interface SubmitPayload {
  submitter_name?: string;
  words: Record<string, string>; // {"4": "word", "5": "word", ...}
}

export function validateLeksiarxeioSubmission(body: unknown): SubmissionValidation {
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
