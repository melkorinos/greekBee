// validateSubmission.test.ts — the Leksindeseis Community Puzzle validation adapter,
// tested directly as a pure function (no route, no Supabase, no NextRequest).

import { describe, expect, it } from "vitest";

import { validateLeksindeseisSubmission } from "@/games/leksindeseis/lib/validateSubmission";

const makeGroups = () =>
  [1, 2, 3, 4].map((i) => ({
    category: `Κατηγορία ${i}`,
    words:    [`α${i}`, `β${i}`, `γ${i}`, `δ${i}`] as [string, string, string, string],
  }));

describe("validateLeksindeseisSubmission", () => {
  it("400 when groups is missing", () => {
    const result = validateLeksindeseisSubmission({ submitter_name: "Νίκος" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.body.error).toBe("Απαιτούνται ακριβώς 4 ομάδες");
    }
  });

  it("400 when there are not exactly 4 Groups", () => {
    const result = validateLeksindeseisSubmission({ groups: makeGroups().slice(0, 3) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.body.error).toBe("Απαιτούνται ακριβώς 4 ομάδες");
  });

  it("400 naming the Group when a Category is blank", () => {
    const groups = makeGroups();
    groups[1].category = "   ";
    const result = validateLeksindeseisSubmission({ groups });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.body.error).toBe("Ομάδα 2: απαιτείται όνομα κατηγορίας");
  });

  it("400 naming the Group when it lacks exactly 4 non-blank words", () => {
    const groups = makeGroups();
    groups[2].words = ["α", "β", " ", "δ"];
    const result = validateLeksindeseisSubmission({ groups });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.body.error).toBe("Ομάδα 3: απαιτούνται ακριβώς 4 λέξεις");
  });

  it("assigns Difficulty 1–4 from submission order and trims everything", () => {
    const groups = makeGroups();
    groups[0].category = "  Πρώτη  ";
    groups[0].words = [" ένα ", "δύο", "τρία", "τέσσερα"];
    const result = validateLeksindeseisSubmission({ submitter_name: " Νίκος ", groups });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.submitter_name).toBe("Νίκος");
      const data = result.row.data as { category: string; words: string[]; difficulty: number }[];
      expect(data.map((g) => g.difficulty)).toEqual([1, 2, 3, 4]);
      expect(data[0].category).toBe("Πρώτη");
      expect(data[0].words[0]).toBe("ένα");
    }
  });
});
