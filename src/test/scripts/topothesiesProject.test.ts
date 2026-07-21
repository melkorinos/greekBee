// Seam — the build-time geometry projector for the Topothesies pipeline.
//
// Pure math that turns [lng,lat] rings into the precomputed SVG the client
// renders (ADR 0018 — no client-side projection). Every expected value here is
// an independently worked example (a hand-computed square/triangle, a known
// great-circle arc), never recomputed the way the code does.

import { describe, it, expect } from "vitest";

import {
  projectPoint,
  ringToPath,
  computeViewBox,
  ringArea,
  centroidLngLat,
  maxPairwiseCentroidKm,
} from "../../../scripts/lib/topothesies/project";
import type { LngLat } from "../../../src/games/topothesies/types";

describe("projectPoint", () => {
  it("negates latitude (SVG y is down, north up) and leaves x=lng at the equator", () => {
    expect(projectPoint([10, 20], 0)).toEqual([10, -20]);
  });

  it("compresses longitude by cos(refLat) so shapes are not stretched east-west", () => {
    // cos(60°) = 0.5 exactly → x is halved.
    const [x, y] = projectPoint([10, 60], 60);
    expect(x).toBeCloseTo(5, 6);
    expect(y).toBeCloseTo(-60, 6);
  });
});

describe("ringToPath", () => {
  it("emits an M…L…Z path with coordinates rounded to the given precision", () => {
    // refLat 0 → x=lng, y=-lat. Triangle (0,0)(2,0)(0,2).
    const ring: LngLat[] = [
      [0, 0],
      [2, 0],
      [0, 2],
    ];
    expect(ringToPath(ring, 0, 2)).toBe("M0 0L2 0L0 -2Z");
  });
});

describe("ringArea", () => {
  it("returns the shoelace area of a 2×2 square as 4 (magnitude)", () => {
    const square: LngLat[] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    expect(Math.abs(ringArea(square))).toBeCloseTo(4, 6);
  });
});

describe("centroidLngLat", () => {
  it("finds the geometric centre of a single square ring", () => {
    const square: LngLat[] = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ];
    expect(centroidLngLat([square])).toEqual([2, 2]);
  });

  it("is area-weighted across a MultiPolygon's parts (a big part dominates a tiny one)", () => {
    // Big 10×10 square centred at (5,5); tiny 1×1 square centred at (100,100).
    const big: LngLat[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const tiny: LngLat[] = [
      [100, 100],
      [101, 100],
      [101, 101],
      [100, 101],
    ];
    const [lng, lat] = centroidLngLat([big], [tiny]);
    // Weighted: (100·5 + 1·100.5)/101 ≈ 5.94 — pulled only slightly off 5.
    expect(lng).toBeCloseTo(5.945, 2);
    expect(lat).toBeCloseTo(5.945, 2);
  });
});

describe("computeViewBox", () => {
  it("frames the projected points as 'minX minY width height' with no padding", () => {
    const points: [number, number][] = [
      [1, -5],
      [4, -5],
      [4, -1],
    ];
    // x: 1..4 → minX 1 width 3; y: -5..-1 → minY -5 height 4.
    expect(computeViewBox(points, 0)).toBe("1 -5 3 4");
  });
});

describe("maxPairwiseCentroidKm", () => {
  it("returns the largest great-circle distance over all centroid pairs", () => {
    // Athens ~ (23.73,37.98), Thessaloniki ~ (22.95,40.62): ~ 300 km apart;
    // a third near Athens must not raise the max above that pair.
    const centroids: LngLat[] = [
      [23.73, 37.98],
      [22.95, 40.62],
      [23.8, 38.0],
    ];
    const max = maxPairwiseCentroidKm(centroids);
    expect(max).toBeGreaterThan(280);
    expect(max).toBeLessThan(320);
  });
});
