// postScore.test.ts — sanitizeDisplayName: trims and falls back to "Ανώνυμος".

import { describe, expect, it } from "vitest";

import { sanitizeDisplayName } from "@/lib/postScore";

describe("sanitizeDisplayName", () => {
  it("returns the name as-is when it is already clean", () => {
    expect(sanitizeDisplayName("Μαρία")).toBe("Μαρία");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeDisplayName("  Μαρία  ")).toBe("Μαρία");
  });

  it("falls back to Ανώνυμος for an empty string", () => {
    expect(sanitizeDisplayName("")).toBe("Ανώνυμος");
  });

  it("falls back to Ανώνυμος for whitespace-only input", () => {
    expect(sanitizeDisplayName("   ")).toBe("Ανώνυμος");
  });

  it("falls back to Ανώνυμος for null", () => {
    expect(sanitizeDisplayName(null)).toBe("Ανώνυμος");
  });

  it("falls back to Ανώνυμος for undefined", () => {
    expect(sanitizeDisplayName(undefined)).toBe("Ανώνυμος");
  });
});
