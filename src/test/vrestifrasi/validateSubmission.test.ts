// validateSubmission.test.ts — the Vres Tin Frasi Community Puzzle validation adapter,
// tested directly as a pure function (no route, no Supabase, no NextRequest).

import { describe, expect, it } from "vitest";

import { validateVresTinFrasiSubmission } from "@/games/vrestifrasi/lib/validateSubmission";
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

  it("422 when the Phrase has fewer than 3 words", () => {
    const result = validateVresTinFrasiSubmission({ phrase: `${w3} ${w4}` });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.body.error).toBe("Η φράση πρέπει να έχει 3–4 λέξεις");
    }
  });

  it("422 when the Phrase has more than 4 words", () => {
    const result = validateVresTinFrasiSubmission({ phrase: `${w3} ${w4} ${w5} ${w3} ${w4}` });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(422);
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

  it("422 with a length error when a word exceeds 8 letters", () => {
    const result = validateVresTinFrasiSubmission({ phrase: `${w3} ααααααααα ${w5}` });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const errors = result.body.errors as Record<string, string>;
      expect(errors["1"]).toBe("Κάθε λέξη πρέπει να έχει 2–8 γράμματα");
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
