import { describe, expect, it } from "vitest";

import { formatEuro } from "@/games/posokanei/lib/format";

describe("formatEuro", () => {
  it("uses two decimals and a Greek comma", () => {
    expect(formatEuro(0.69)).toBe("0,69 €");
    expect(formatEuro(2)).toBe("2,00 €");
    expect(formatEuro(12.5)).toBe("12,50 €");
  });
});
