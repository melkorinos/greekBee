import { describe, expect, it } from "vitest";

import { evaluateGuess } from "@/games/logopaignio/lib/evaluateGuess";
import type { LogopaignioPuzzle } from "@/games/logopaignio/types";

// Cosmote is the canonical bilingual case: a Greek audience writes it either as
// "Cosmote" (Latin) or "Κοσμοτε" (Greek), so the accept-list must carry both.
const COSMOTE: LogopaignioPuzzle = {
  id: "cosmote", brand: "Cosmote", sector: "Τηλεπικοινωνίες",
  accept: ["Cosmote", "Κοσμοτε"], markAsset: "/x.svg",
};

describe("evaluateGuess", () => {
  it("accepts the exact canonical spelling", () => {
    expect(evaluateGuess("Cosmote", COSMOTE).correct).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(evaluateGuess("cosmote", COSMOTE).correct).toBe(true);
    expect(evaluateGuess("COSMOTE", COSMOTE).correct).toBe(true);
  });

  it("accepts the Greek spelling via the accept-list (Greek⇄Latin fork)", () => {
    expect(evaluateGuess("κοσμοτε", COSMOTE).correct).toBe(true);
  });

  it("is accent-insensitive", () => {
    // A player who types the Greek form with an accent still wins.
    expect(evaluateGuess("Κοσμοτέ", COSMOTE).correct).toBe(true);
  });

  it("ignores surrounding and internal whitespace", () => {
    const island: LogopaignioPuzzle = {
      id: "coffee-island", brand: "Coffee Island", sector: "Καφέ",
      accept: ["Coffee Island"], markAsset: "/x.svg",
    };
    expect(evaluateGuess("  coffee island  ", island).correct).toBe(true);
    expect(evaluateGuess("coffeeisland", island).correct).toBe(true);
  });

  it("rejects a wrong brand", () => {
    expect(evaluateGuess("Vodafone", COSMOTE).correct).toBe(false);
  });

  it("rejects empty / whitespace-only input", () => {
    expect(evaluateGuess("", COSMOTE)).toMatchObject({ correct: false, normalizedInput: "" });
    expect(evaluateGuess("   ", COSMOTE)).toMatchObject({ correct: false, normalizedInput: "" });
  });

  it("returns the normalized input for the caller to inspect", () => {
    expect(evaluateGuess("  Κοσμοτέ ", COSMOTE).normalizedInput).toBe("κοσμοτε");
  });
});
