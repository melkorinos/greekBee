import { describe, expect, it } from "vitest";

import { selectDailyPuzzle } from "@/games/posokanei/lib/selectDailyPuzzle";
import type { PosokaneiPuzzle } from "@/games/posokanei/types";

function puzzle(date: string, item: string): PosokaneiPuzzle {
  return {
    date, item, itemType: "generic", unit: "τεμ", price: 1, band: 0.15,
    photo: "/x.svg", photoSource: "x", photoLicense: "x", sourceStore: "x", sourceDate: date,
  };
}

describe("selectDailyPuzzle", () => {
  const pool = [puzzle("2026-08-01", "α"), puzzle("2026-08-02", "β"), puzzle("2026-08-03", "γ")];

  it("throws on an empty pool", () => {
    expect(() => selectDailyPuzzle("2026-08-01", [])).toThrow();
  });

  it("returns the row whose date matches today exactly", () => {
    expect(selectDailyPuzzle("2026-08-02", pool).item).toBe("β");
  });

  it("falls back to deterministic rotation when no row matches the date", () => {
    // No 2026-09-09 row → rotate over the sorted pool; same date → same pick.
    const a = selectDailyPuzzle("2026-09-09", pool);
    const b = selectDailyPuzzle("2026-09-09", pool);
    expect(a).toBe(b);
    expect(pool).toContain(a);
  });

  it("always returns the only puzzle when the pool has one row (sample build)", () => {
    const one = [puzzle("2026-08-01", "μόνο")];
    expect(selectDailyPuzzle("2030-01-01", one).item).toBe("μόνο");
    expect(selectDailyPuzzle("2026-08-01", one).item).toBe("μόνο");
  });

  it("rotation is stable regardless of input order", () => {
    const reversed = [...pool].reverse();
    expect(selectDailyPuzzle("2026-09-09", pool)).toEqual(selectDailyPuzzle("2026-09-09", reversed));
  });
});
