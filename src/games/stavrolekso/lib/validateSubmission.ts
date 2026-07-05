// validateSubmission — the Stavrolekso Community Puzzle validation adapter.
//
// One home for every wire invariant of a Stavrolekso Puzzle, shared by three
// callers: the submission route (POST), the creator-edit route (PATCH), and
// the maker page (pre-flight feedback before it ever hits the network).
// Client-safe: no word pools, no server imports — safe to export from the barrel.
//
// The maker keeps its own authoring-only checks (connectivity, all slots
// filled) — those are quality gates for building, not wire invariants.

import type { SubmissionValidation } from "@/lib/communityPuzzleLifecycle";
import type { StavroleksoPuzzleData } from "@/games/stavrolekso/types";
import { STAVROLEKSO } from "@/config/gameRules";

/** Edit PIN format: 4–8 alphanumeric characters (ADR 0005). */
export const EDIT_PIN_PATTERN = /^[a-zA-Z0-9]{4,8}$/;

export const EDIT_PIN_ERROR = "Edit PIN: 4–8 αλφαριθμητικοί χαρακτήρες.";

/**
 * Grid + slot invariants for a Stavrolekso Puzzle `data` blob.
 * Returns the player-facing error message, or null when the invariants hold.
 * Enforced on submit AND creator edit — an edit must never regress a puzzle
 * below the bar its submission had to clear.
 */
export function validateStavroleksoData(data: unknown): string | null {
  if (!data || typeof data !== "object") return "data is required";

  const d = data as StavroleksoPuzzleData;

  if (!(STAVROLEKSO.VALID_GRID_SIZES as readonly number[]).includes(d.width) || d.width !== d.height) {
    return "Το πλέγμα πρέπει να είναι τετράγωνο: 9×9, 13×13 ή 15×15";
  }

  if (!Array.isArray(d.slots) || d.slots.length === 0) {
    return "Το παζλ χρειάζεται τουλάχιστον ένα slot";
  }

  const hasAcross = d.slots.some((s) => s.direction === "across");
  const hasDown   = d.slots.some((s) => s.direction === "down");
  if (!hasAcross || !hasDown) {
    return "Χρειάζεται τουλάχιστον μία Οριζόντια και μία Κάθετα λέξη.";
  }

  return null;
}

interface SubmitPayload {
  title?: string;
  submitter_name?: string;
  edit_pin: string;
  data: StavroleksoPuzzleData;
}

export function validateStavroleksoSubmission(body: unknown): SubmissionValidation {
  const { title, submitter_name = "", edit_pin, data } = (body ?? {}) as SubmitPayload;

  if (!edit_pin || typeof edit_pin !== "string" || !EDIT_PIN_PATTERN.test(edit_pin)) {
    return { ok: false, status: 400, body: { error: EDIT_PIN_ERROR } };
  }

  const dataError = validateStavroleksoData(data);
  if (dataError) {
    return { ok: false, status: 400, body: { error: dataError } };
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
