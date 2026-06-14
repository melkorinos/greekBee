// POST /api/community-puzzles/vrestifrasi — submit a community phrase.
// GET  /api/community-puzzles/vrestifrasi?status=pending — list (admin only).
//
// Submission: one phrase string. Validated: 3–4 words, each word 2–8 letters,
// each word in the word pool.
//
// Auth, insert, and list live in the Community Puzzle Lifecycle module —
// this file owns only the Vres Tin Frasi validation adapter (and with it the
// word-pool imports, which therefore stay out of the other games' bundles).

import { createListHandler, createSubmitHandler } from "@/lib/communityPuzzleLifecycle";
import type { SubmissionValidation } from "@/lib/communityPuzzleLifecycle";
import { normalizeLetters } from "@/lib/normalize";
import words2 from "@/data/leksiarxeio/words-2.json";
import words3 from "@/data/leksiarxeio/words-3.json";
import words4 from "@/data/leksiarxeio/words-4.json";
import words5 from "@/data/leksiarxeio/words-5.json";
import words6 from "@/data/leksiarxeio/words-6.json";
import words7 from "@/data/leksiarxeio/words-7.json";
import words8 from "@/data/leksiarxeio/words-8.json";

export const runtime = "edge";

const WORD_POOL: Record<number, Set<string>> = {
  2: new Set(words2 as string[]),
  3: new Set(words3 as string[]),
  4: new Set(words4 as string[]),
  5: new Set(words5 as string[]),
  6: new Set(words6 as string[]),
  7: new Set(words7 as string[]),
  8: new Set(words8 as string[]),
};

function isValidPhraseWord(word: string): boolean {
  if (word.length < 2 || word.length > 8) return false;
  return WORD_POOL[word.length]?.has(word) ?? false;
}

interface SubmitPayload {
  submitter_name?: string;
  phrase: string;
}

function validate(body: unknown): SubmissionValidation {
  const { submitter_name = "", phrase } = (body ?? {}) as SubmitPayload;

  if (!phrase || typeof phrase !== "string") {
    return { ok: false, status: 400, body: { error: "phrase is required" } };
  }

  const normalizedPhrase = phrase.trim();
  const rawWords = normalizedPhrase.split(/\s+/).filter(Boolean);
  const words    = rawWords.map((w) => normalizeLetters(w));

  if (words.length < 3 || words.length > 4) {
    return { ok: false, status: 422, body: { error: "Η φράση πρέπει να έχει 3–4 λέξεις" } };
  }

  const wordErrors: Record<string, string> = {};
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.length < 2 || w.length > 8) {
      wordErrors[String(i)] = `Κάθε λέξη πρέπει να έχει 2–8 γράμματα`;
    } else if (!isValidPhraseWord(w)) {
      wordErrors[String(i)] = `"${rawWords[i]}" δεν βρέθηκε στη λίστα`;
    }
  }

  if (Object.keys(wordErrors).length > 0) {
    return { ok: false, status: 422, body: { errors: wordErrors } };
  }

  // Store in display form (original casing with accents)
  return {
    ok:  true,
    row: {
      submitter_name: (submitter_name ?? "").trim(),
      data:           { phrase: normalizedPhrase },
    },
  };
}

const config = { table: "community_vrestifrasi_puzzles", validate };

export const POST = createSubmitHandler(config);
export const GET  = createListHandler(config);
