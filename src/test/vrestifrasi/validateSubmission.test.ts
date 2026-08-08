// validateSubmission.test.ts — the Vres Tin Frasi Community Puzzle validation adapter,
// tested directly as a pure function (no route, no Supabase, no NextRequest).

import { describe, expect, it } from "vitest";

import { validateVresTinFrasiSubmission } from "@/games/vrestifrasi/lib/validateSubmission";
import { VRESTIFRASI } from "@/config/gameRules";
import words3 from "@/data/leksiarxeio/words-3.json";
import words4 from "@/data/leksiarxeio/words-4.json";
import words5 from "@/data/leksiarxeio/words-5.json";

// Pool entries are guaranteed valid and already normalised.
const w3 = (words3 as string[])[0];
const w4 = (words4 as string[])[0];
const w5 = (words5 as string[])[0];

describe("validateVresTinFrasiSubmission", () => {
  it("400 when phrase is missing", () => {
    const result = validateVresTinFrasiSubmission({ submitter_name: "Νίκος" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.body.error).toBe("phrase is required");
    }
  });

  it("422 when the Phrase has fewer than MIN_PHRASE_WORDS words", () => {
    const result = validateVresTinFrasiSubmission({ phrase: w3 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.body.error).toBe(
        `Η φράση πρέπει να έχει ${VRESTIFRASI.MIN_PHRASE_WORDS}–${VRESTIFRASI.MAX_PHRASE_WORDS} λέξεις`,
      );
    }
  });

  it("422 when the Phrase has more than MAX_PHRASE_WORDS words", () => {
    const tooMany = Array(VRESTIFRASI.MAX_PHRASE_WORDS + 1).fill(w3).join(" ");
    const result  = validateVresTinFrasiSubmission({ phrase: tooMany });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(422);
  });

  // The bounds were 3–4 while the shipped corpus was full of 5-word phrases and
  // proverbs up to 9 — a player could not submit a phrase the game itself serves.
  it("accepts the 5-word shape the daily corpus actually uses", () => {
    const result = validateVresTinFrasiSubmission({
      phrase: `η ${w3} ${w4} ${w5} ${w3}`,
    });
    expect(result.ok).toBe(true);
  });

  it("422 with a per-word error when a word is not in the pool", () => {
    const result = validateVresTinFrasiSubmission({ phrase: `${w3} ζζζζζζ ${w5}` });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      const errors = result.body.errors as Record<string, string>;
      expect(errors["1"]).toBe('"ζζζζζζ" δεν βρέθηκε στη λίστα');
    }
  });

  it("422 with a length error when a word exceeds MAX_WORD_LENGTH", () => {
    const tooLong = "α".repeat(VRESTIFRASI.MAX_WORD_LENGTH + 1);
    const result  = validateVresTinFrasiSubmission({ phrase: `${w3} ${tooLong} ${w5}` });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const errors = result.body.errors as Record<string, string>;
      expect(errors["1"]).toBe(
        `Κάθε λέξη πρέπει να έχει ${VRESTIFRASI.MIN_WORD_LENGTH}–${VRESTIFRASI.MAX_WORD_LENGTH} γράμματα`,
      );
    }
  });

  // The single-letter articles are the bug this pair of bounds shipped with:
  // no 1-letter list existed, so «Η γλώσσα κόκαλα δεν έχει» was unsubmittable.
  it("accepts the standalone articles «η» and «ο»", () => {
    for (const article of ["η", "ο"]) {
      const result = validateVresTinFrasiSubmission({ phrase: `${article} ${w4} ${w5}` });
      expect(result.ok).toBe(true);
    }
  });

  it("422 when a word is not in the pool even at a valid length", () => {
    const result = validateVresTinFrasiSubmission({ phrase: `ξ ${w4} ${w5}` });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const errors = result.body.errors as Record<string, string>;
      expect(errors["0"]).toBe('"ξ" δεν βρέθηκε στη λίστα');
    }
  });

  it("stores the Phrase in display form: trimmed, original casing preserved", () => {
    const display = `${w3.toUpperCase()} ${w4} ${w5}`;
    const result = validateVresTinFrasiSubmission({ submitter_name: " Νίκος ", phrase: `  ${display}  ` });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.submitter_name).toBe("Νίκος");
      expect((result.row.data as { phrase: string }).phrase).toBe(display);
    }
  });
});
