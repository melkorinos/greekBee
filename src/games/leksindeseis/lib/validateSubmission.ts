// validateSubmission — the Leksindeseis Community Puzzle validation adapter.
//
// A submission carries 4 Groups of 4 words + a Category name per Group.
// Words are free-form (editorial judgment, no dictionary validation).
// Difficulty is inferred from submission order: group index 0 = difficulty 1 (easiest).

import type { SubmissionValidation } from "@/lib/communityPuzzleLifecycle";

interface SubmitGroup {
  category: string;
  words: [string, string, string, string];
}

interface SubmitPayload {
  submitter_name?: string;
  groups: SubmitGroup[]; // exactly 4, ordered easiest→hardest
}

export function validateLeksindeseisSubmission(body: unknown): SubmissionValidation {
  const { submitter_name = "", groups } = (body ?? {}) as SubmitPayload;

  if (!Array.isArray(groups) || groups.length !== 4) {
    return { ok: false, status: 400, body: { error: "Απαιτούνται ακριβώς 4 ομάδες" } };
  }

  for (let i = 0; i < 4; i++) {
    const g = groups[i];
    if (!g?.category?.trim()) {
      return { ok: false, status: 400, body: { error: `Ομάδα ${i + 1}: απαιτείται όνομα κατηγορίας` } };
    }
    if (!Array.isArray(g.words) || g.words.length !== 4 || g.words.some((w) => !w?.trim())) {
      return { ok: false, status: 400, body: { error: `Ομάδα ${i + 1}: απαιτούνται ακριβώς 4 λέξεις` } };
    }
  }

  // Assign difficulty from order (1 = easiest, 4 = hardest)
  const data = groups.map((g, i) => ({
    category:   g.category.trim(),
    words:      g.words.map((w) => w.trim()) as [string, string, string, string],
    difficulty: (i + 1) as 1 | 2 | 3 | 4,
  }));

  return { ok: true, row: { submitter_name: submitter_name.trim(), data } };
}
