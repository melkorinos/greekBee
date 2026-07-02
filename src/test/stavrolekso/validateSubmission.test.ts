// validateSubmission.test.ts — the Stavrolekso Community Puzzle validation adapter:
// Edit PIN format, grid + slot invariants, and the full submission validator,
// tested directly as pure functions (no route, no Supabase, no NextRequest).
// The same invariants gate POST (submit), PATCH (creator edit), and the maker.

import { describe, expect, it } from "vitest";

import {
  EDIT_PIN_PATTERN,
  EDIT_PIN_ERROR,
  validateStavroleksoData,
  validateStavroleksoSubmission,
} from "@/games/stavrolekso/lib";

const slot = (direction: "across" | "down", number = 1) => ({
  number,
  direction,
  startRow: 0,
  startCol: 0,
  answer:   "ααα",
  clue:     "ερώτηση",
});

const validData = () => ({
  width:        9,
  height:       9,
  blackSquares: [] as [number, number][],
  slots:        [slot("across"), slot("down")],
});

describe("EDIT_PIN_PATTERN", () => {
  it("accepts 4–8 alphanumeric characters", () => {
    expect(EDIT_PIN_PATTERN.test("abcd")).toBe(true);
    expect(EDIT_PIN_PATTERN.test("A1b2C3d4")).toBe(true);
  });

  it("rejects too short, too long, non-latin, and spaced PINs", () => {
    expect(EDIT_PIN_PATTERN.test("abc")).toBe(false);
    expect(EDIT_PIN_PATTERN.test("abcdefghi")).toBe(false);
    expect(EDIT_PIN_PATTERN.test("αβγδ")).toBe(false);
    expect(EDIT_PIN_PATTERN.test("ab 1")).toBe(false);
    expect(EDIT_PIN_PATTERN.test("")).toBe(false);
  });
});

describe("validateStavroleksoData", () => {
  it("null (valid) for a square supported grid with both directions", () => {
    expect(validateStavroleksoData(validData())).toBeNull();
  });

  it("rejects missing data", () => {
    expect(validateStavroleksoData(undefined)).toBe("data is required");
    expect(validateStavroleksoData(null)).toBe("data is required");
  });

  it("rejects an unsupported grid size", () => {
    expect(validateStavroleksoData({ ...validData(), width: 10, height: 10 })).toMatch(/τετράγωνο/);
  });

  it("rejects a non-square grid", () => {
    expect(validateStavroleksoData({ ...validData(), width: 9, height: 13 })).toMatch(/τετράγωνο/);
  });

  it("rejects an empty slot list", () => {
    expect(validateStavroleksoData({ ...validData(), slots: [] })).toMatch(/τουλάχιστον ένα slot/);
  });

  it("rejects a puzzle missing one direction", () => {
    expect(validateStavroleksoData({ ...validData(), slots: [slot("across")] }))
      .toBe("Χρειάζεται τουλάχιστον μία Οριζόντια και μία Κάθετα λέξη.");
  });
});

describe("validateStavroleksoSubmission", () => {
  it("400 with the PIN error when edit_pin is missing or malformed", () => {
    for (const edit_pin of [undefined, "abc", "αβγδ"]) {
      const result = validateStavroleksoSubmission({ edit_pin, data: validData() });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
        expect(result.body.error).toBe(EDIT_PIN_ERROR);
      }
    }
  });

  it("400 with the data error when the grid invariants fail", () => {
    const result = validateStavroleksoSubmission({ edit_pin: "pin123", data: { ...validData(), slots: [] } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.body.error).toMatch(/τουλάχιστον ένα slot/);
    }
  });

  it("accepts a valid submission, trimming title and submitter_name", () => {
    const data = validData();
    const result = validateStavroleksoSubmission({
      title: " Τίτλος ", submitter_name: " Νίκος ", edit_pin: "pin123", data,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row).toEqual({
        title: "Τίτλος", submitter_name: "Νίκος", edit_pin: "pin123", data,
      });
    }
  });

  it("stores title as null when omitted", () => {
    const result = validateStavroleksoSubmission({ edit_pin: "pin123", data: validData() });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.row.title).toBeNull();
  });
});
