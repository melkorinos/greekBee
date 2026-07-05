// scoring.test.ts — unit tests for scoreVresTinFrasi.
// Same formula as Leksiarxeio: 6 pts for a 1-guess win down to 1 pt for a
// 6-guess win; a loss is always 0.

import { describe, expect, it } from "vitest";

import { scoreVresTinFrasi } from "@/games/vrestifrasi/lib/scoring";

describe("scoreVresTinFrasi", () => {
  it("awards 6 points for a win on the first guess", () => {
    expect(scoreVresTinFrasi(1, true)).toBe(6);
  });

  it("awards 4 points for a win on the third guess", () => {
    expect(scoreVresTinFrasi(3, true)).toBe(4);
  });

  it("awards 1 point for a win on the sixth (last) guess", () => {
    expect(scoreVresTinFrasi(6, true)).toBe(1);
  });

  it("returns 0 for a loss regardless of attempts", () => {
    expect(scoreVresTinFrasi(6, false)).toBe(0);
    expect(scoreVresTinFrasi(1, false)).toBe(0);
  });

  it("never drops below 1 for a win (defensive floor)", () => {
    expect(scoreVresTinFrasi(7, true)).toBe(1);
  });
});
