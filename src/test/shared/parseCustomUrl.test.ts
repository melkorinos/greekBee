// parseCustomUrl.test.ts — unit tests for the custom puzzle URL param validator.
// parseCustomUrl is the security/correctness boundary for the
// /leksokipos/[center]/[outer] route. Bugs here either cause silent bad
// games or break valid URLs for real players.

import { describe, expect, it } from "vitest";

import { greekToGreeklish } from "@/lib/greeklish";
import { parseCustomUrl } from "@/games/leksokipos/lib/parseCustomUrl";

describe("parseCustomUrl", () => {
  // ── Valid inputs ─────────────────────────────────────────────────────────────

  it("returns parsed center and outer for a valid 7-unique-letter combo", () => {
    const result = parseCustomUrl("α", "βγδεζη");
    expect(result).toEqual({ center: "α", outer: ["β", "γ", "δ", "ε", "ζ", "η"] });
  });

  it("normalises an accented center letter", () => {
    const result = parseCustomUrl("ά", "βγδεζη");
    expect(result?.center).toBe("α");
  });

  it("normalises accented outer letters", () => {
    const result = parseCustomUrl("α", "βγδέζη");
    expect(result?.outer[3]).toBe("ε");
  });

  it("normalises final sigma in outer letters", () => {
    // ς (final sigma) should normalise to σ
    const outer = "βγδεζ" + "\u03c2"; // 5 base letters + final sigma = 6 total
    const result = parseCustomUrl("α", outer);
    expect(result?.outer[5]).toBe("σ");
  });

  it("URL-decodes percent-encoded Greek letters", () => {
    // α percent-encoded is %CE%B1
    const result = parseCustomUrl("%CE%B1", "βγδεζη");
    expect(result?.center).toBe("α");
  });

  // ── Invalid center ───────────────────────────────────────────────────────────

  it("returns null when center is empty", () => {
    expect(parseCustomUrl("", "βγδεζη")).toBeNull();
  });

  it("returns null when center is more than one letter", () => {
    expect(parseCustomUrl("αβ", "γδεζηθι")).toBeNull();
  });

  it("returns null when center is a digit", () => {
    expect(parseCustomUrl("1", "βγδεζη")).toBeNull();
  });

  it("returns null when center is a space", () => {
    expect(parseCustomUrl(" ", "βγδεζη")).toBeNull();
  });

  // ── Invalid outer ────────────────────────────────────────────────────────────

  it("returns null when outer has fewer than 6 letters", () => {
    expect(parseCustomUrl("α", "βγδεζ")).toBeNull();
  });

  it("returns null when outer has more than 6 letters", () => {
    expect(parseCustomUrl("α", "βγδεζηι")).toBeNull();
  });

  it("returns null when outer contains a digit", () => {
    expect(parseCustomUrl("α", "βγδεζ1")).toBeNull();
  });

  it("returns null when outer is empty", () => {
    expect(parseCustomUrl("α", "")).toBeNull();
  });

  // ── Uniqueness constraint ────────────────────────────────────────────────────

  it("returns null when center letter appears in outer letters", () => {
    // α is both center and the first outer letter
    expect(parseCustomUrl("α", "αβγδεζ")).toBeNull();
  });

  it("returns null when outer letters contain duplicates", () => {
    // β appears twice
    expect(parseCustomUrl("α", "ββγδεζ")).toBeNull();
  });

  it("returns null when all 7 letters are the same", () => {
    expect(parseCustomUrl("α", "αααααα")).toBeNull();
  });

  // ── Return value shape ───────────────────────────────────────────────────────

  it("outer array has exactly 6 elements on success", () => {
    const result = parseCustomUrl("α", "βγδεζη");
    expect(result?.outer).toHaveLength(6);
  });

  it("center is a single character string on success", () => {
    const result = parseCustomUrl("α", "βγδεζη");
    expect(result?.center).toHaveLength(1);
  });
});

// ── Greeklish input ───────────────────────────────────────────────────────────
// The canonical URL format uses greeklish (plain ASCII) since Greek percent-
// encoded letters look ugly when shared.  parseCustomUrl must accept greeklish
// in addition to direct Greek input.

describe("parseCustomUrl — greeklish input", () => {
  it("accepts greeklish center and converts to Greek internally", () => {
    const result = parseCustomUrl("k", "aeiost");
    expect(result).not.toBeNull();
    expect(result?.center).toBe("κ");
  });

  it("produces the correct outer letter array from greeklish", () => {
    const result = parseCustomUrl("k", "aeiost");
    expect(result?.outer).toEqual(["α", "ε", "ι", "ο", "σ", "τ"]);
  });

  it("handles all 4 awkward mappings: q→θ, j→ξ, x→χ, c→ψ", () => {
    // center = θ (q), outer = ξ(j) χ(x) ψ(c) α(a) β(b) γ(g)
    const result = parseCustomUrl("q", "jxcabg");
    expect(result?.center).toBe("θ");
    expect(result?.outer).toEqual(["ξ", "χ", "ψ", "α", "β", "γ"]);
  });

  it("greeklish center with Greek outer is accepted (mixed input)", () => {
    // center greeklish 'k' → κ; outer is Greek βγδεζη
    const result = parseCustomUrl("k", "βγδεζη");
    expect(result?.center).toBe("κ");
    expect(result?.outer).toEqual(["β", "γ", "δ", "ε", "ζ", "η"]);
  });

  it("returns null when greeklish outer has fewer than 6 letters", () => {
    expect(parseCustomUrl("k", "aeio")).toBeNull();
  });

  it("returns null when greeklish outer has more than 6 letters", () => {
    expect(parseCustomUrl("k", "aeiostn")).toBeNull();
  });

  it("returns null when greeklish center duplicates a greeklish outer letter", () => {
    // 'a'→α appears in both center and outer
    expect(parseCustomUrl("a", "abgdez")).toBeNull();
  });

  it("round-trips: Greek → greeklish → parseCustomUrl → same Greek letters", () => {
    const center = "κ";
    const outer  = ["α", "ε", "ι", "ο", "σ", "τ"];
    const urlCenter = greekToGreeklish(center);
    const urlOuter  = greekToGreeklish(outer.join(""));
    const result = parseCustomUrl(urlCenter, urlOuter);
    expect(result?.center).toBe(center);
    expect(result?.outer).toEqual(outer);
  });
});
