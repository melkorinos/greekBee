// validateSubmission.test.ts — the Leksiarxeio Community Puzzle validation adapter,
// tested directly as a pure function (no route, no Supabase, no NextRequest).

import { describe, expect, it } from "vitest";

import { validateLeksiarxeioSubmission } from "@/games/leksiarxeio/lib/validateSubmission";
import { getValidWords } from "@/data/leksiarxeio";
import type { LeksiarxeioLength } from "@/games/leksiarxeio/types";

const LENGTHS: LeksiarxeioLength[] = [4, 5, 6, 7, 8];

/** First Word Pool entry per Length — guaranteed valid, already normalised. */
const poolWord = (len: LeksiarxeioLength) => getValidWords(len)[0];

const validWords = (): Record<string, string> =>
  Object.fromEntries(LENGTHS.map((len) => [String(len), poolWord(len)]));

describe("validateLeksiarxeioSubmission", () => {
  it("400 when words is missing", () => {
    const result = validateLeksiarxeioSubmission({ submitter_name: "Νίκος" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.body.error).toBe("words is required");
    }
  });

  it("400 when body is null", () => {
    const result = validateLeksiarxeioSubmission(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("accepts a submission with a Word Pool word at every Length", () => {
    const result = validateLeksiarxeioSubmission({ submitter_name: "  Νίκος  ", words: validWords() });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.submitter_name).toBe("Νίκος");
      const data = result.row.data as Record<string, string>;
      for (const len of LENGTHS) expect(data[String(len)]).toBe(poolWord(len));
    }
  });

  it("422 with a per-length error when a Length is missing", () => {
    const words = validWords();
    delete words["6"];
    const result = validateLeksiarxeioSubmission({ words });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      const errors = result.body.errors as Record<string, string>;
      expect(errors["6"]).toBe("Απαιτείται λέξη");
      expect(Object.keys(errors)).toEqual(["6"]);
    }
  });

  it("422 with a per-length error when a word is not in its Word Pool", () => {
    const words = { ...validWords(), "4": "ζζζζ" };
    const result = validateLeksiarxeioSubmission({ words });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      const errors = result.body.errors as Record<string, string>;
      expect(errors["4"]).toBe("Η λέξη δεν βρίσκεται στη λίστα");
    }
  });

  it("normalises input (uppercase → pool form) before both validation and storage", () => {
    const words = { ...validWords(), "5": ` ${poolWord(5).toUpperCase()} ` };
    const result = validateLeksiarxeioSubmission({ words });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.row.data as Record<string, string>)["5"]).toBe(poolWord(5));
    }
  });
});
