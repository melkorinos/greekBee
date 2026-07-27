import { describe, expect, it } from "vitest";

import { selectDailyPuzzle } from "@/games/logopaignio/lib/selectDailyPuzzle";
import type { LogopaignioPuzzle } from "@/games/logopaignio/types";

function puzzle(id: string, extra?: Partial<LogopaignioPuzzle>): LogopaignioPuzzle {
  return { id, brand: id, sector: "x", accept: [id], markAsset: "/x.svg", ...extra };
}

describe("selectDailyPuzzle", () => {
  const pool = [puzzle("a"), puzzle("b"), puzzle("c")];

  it("throws on an empty pool", () => {
    expect(() => selectDailyPuzzle("2026-08-01", [])).toThrow();
  });

  it("returns the row whose date matches today exactly", () => {
    const dated = [puzzle("a"), puzzle("b", { date: "2026-08-02" }), puzzle("c")];
    expect(selectDailyPuzzle("2026-08-02", dated).id).toBe("b");
  });

  it("falls back to deterministic rotation when no row matches the date", () => {
    const a = selectDailyPuzzle("2026-09-09", pool);
    const b = selectDailyPuzzle("2026-09-09", pool);
    expect(a).toBe(b);
    expect(pool).toContain(a);
  });

  it("rotation is stable regardless of input order (sorted by id)", () => {
    const reversed = [...pool].reverse();
    expect(selectDailyPuzzle("2026-09-09", pool)).toEqual(selectDailyPuzzle("2026-09-09", reversed));
  });

  it("always returns the only puzzle when the pool has one (undated sample) row", () => {
    const one = [puzzle("only")];
    expect(selectDailyPuzzle("2030-01-01", one).id).toBe("only");
    expect(selectDailyPuzzle("2026-08-01", one).id).toBe("only");
  });
});
