// geo.test.ts — Worldle-style hint math for Topothesies (pure, no React).
// All three primitives operate on real [lng, lat] centroids; expected values
// come from independent references (great-circle worked examples, compass
// bucketing), never from re-running the implementation.

import { describe, expect, it } from "vitest";

import type { LngLat } from "@/games/topothesies/types";
import { bearingToArrow, haversineKm, proximityPct } from "@/games/topothesies/lib/geo";

// Known Greek reference points [lng, lat].
const ATHENS: LngLat = [23.7275, 37.9838];
const THESSALONIKI: LngLat = [22.9444, 40.6401];

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(ATHENS, ATHENS)).toBe(0);
  });

  it("matches the known Athens→Thessaloniki great-circle distance (~302 km)", () => {
    // Independent reference: ~302 km straight-line. Allow a small tolerance.
    expect(haversineKm(ATHENS, THESSALONIKI)).toBeGreaterThan(298);
    expect(haversineKm(ATHENS, THESSALONIKI)).toBeLessThan(306);
  });

  it("is symmetric", () => {
    expect(haversineKm(ATHENS, THESSALONIKI)).toBeCloseTo(
      haversineKm(THESSALONIKI, ATHENS),
      6,
    );
  });

  it("spans a known one-degree-of-latitude arc (~111 km)", () => {
    expect(haversineKm([25, 40], [25, 41])).toBeGreaterThan(110);
    expect(haversineKm([25, 40], [25, 41])).toBeLessThan(112);
  });
});

describe("bearingToArrow", () => {
  const origin: LngLat = [25, 39];

  it("points ↑ due north", () => {
    expect(bearingToArrow(origin, [25, 41])).toBe("↑");
  });

  it("points ↓ due south", () => {
    expect(bearingToArrow(origin, [25, 37])).toBe("↓");
  });

  it("points → due east", () => {
    expect(bearingToArrow(origin, [27, 39])).toBe("→");
  });

  it("points ← due west", () => {
    expect(bearingToArrow(origin, [23, 39])).toBe("←");
  });

  it("points ↗ to the north-east", () => {
    expect(bearingToArrow([0, 0], [1, 1])).toBe("↗");
  });

  it("points ↙ to the south-west", () => {
    expect(bearingToArrow([0, 0], [-1, -1])).toBe("↙");
  });

  it("returns one of the eight compass glyphs", () => {
    const glyphs = new Set(["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"]);
    for (let deg = 0; deg < 360; deg += 7) {
      const rad = (deg * Math.PI) / 180;
      const to: LngLat = [25 + Math.sin(rad), 39 + Math.cos(rad)];
      expect(glyphs.has(bearingToArrow(origin, to))).toBe(true);
    }
  });
});

describe("proximityPct", () => {
  it("is 100 when the guess sits on the target (distance 0)", () => {
    expect(proximityPct(0, 500)).toBe(100);
  });

  it("is 0 at or beyond the max scale", () => {
    expect(proximityPct(500, 500)).toBe(0);
    expect(proximityPct(900, 500)).toBe(0);
  });

  it("is 50 at half the max scale", () => {
    expect(proximityPct(250, 500)).toBe(50);
  });

  it("guards an unset (0) scale — returns 0, never divides by zero", () => {
    expect(proximityPct(0, 0)).toBe(0);
    expect(proximityPct(100, 0)).toBe(0);
  });

  it("guards a negative/undefined-ish scale", () => {
    expect(proximityPct(100, -1)).toBe(0);
  });
});
