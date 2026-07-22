// Seam — the OSM `out geom` → GeoJSON polygon assembler for the Topothesies
// pipeline. Overpass returns a boundary relation as unordered member ways; this
// module stitches them into closed rings and nests holes. Every expected value
// here is an independently worked example (hand-built squares), never recomputed
// the way the code does.

import { describe, it, expect } from "vitest";

import {
  assembleRings,
  signedRingArea,
  assembleRelation,
  type LngLat,
  type OverpassRelation,
} from "../../../scripts/lib/topothesies/osmPolygons";

const closed = (r: LngLat[]) =>
  r.length > 3 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1];

/** Build an Overpass way member from [lng,lat] pairs (source order is lat/lon). */
const way = (role: string, pts: LngLat[]) => ({
  type: "way",
  role,
  geometry: pts.map(([lng, lat]) => ({ lat, lon: lng })),
});

describe("assembleRings", () => {
  it("stitches two head-to-tail segments into one closed ring", () => {
    const rings = assembleRings([
      [[0, 0], [2, 0], [2, 2]],
      [[2, 2], [0, 2], [0, 0]],
    ]);
    expect(rings).toHaveLength(1);
    expect(closed(rings[0])).toBe(true);
    // 2×2 square, CCW: five points ending where it started.
    expect(rings[0]).toEqual([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]);
  });

  it("reverses a segment whose tail (not head) meets the chain", () => {
    const rings = assembleRings([
      [[0, 0], [2, 0], [2, 2]],
      [[0, 0], [0, 2], [2, 2]], // same edge, wound the other way
    ]);
    expect(rings).toHaveLength(1);
    expect(rings[0]).toEqual([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]);
  });

  it("passes an already-closed way through untouched", () => {
    const square: LngLat[] = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    expect(assembleRings([square])).toEqual([square]);
  });

  it("returns an open ring rather than looping forever when it cannot close", () => {
    const rings = assembleRings([[[0, 0], [1, 0]]]);
    expect(rings).toEqual([[[0, 0], [1, 0]]]);
    expect(closed(rings[0])).toBe(false);
  });
});

describe("signedRingArea", () => {
  it("is +4 for a CCW 2×2 square and -4 when wound clockwise", () => {
    const ccw: LngLat[] = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]];
    expect(signedRingArea(ccw)).toBe(4);
    expect(signedRingArea([...ccw].reverse())).toBe(-4);
  });
});

describe("assembleRelation", () => {
  it("nests an inner ring as a hole in the outer that contains it", () => {
    const rel = {
      type: "relation",
      id: 1,
      tags: { "name:el": "Δοκιμή", wikidata: "Q1" },
      members: [
        way("outer", [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]),
        way("inner", [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]),
      ],
    } as unknown as OverpassRelation;

    const f = assembleRelation(rel)!;
    expect(f.properties).toEqual({ shapeName: "Δοκιμή", wikidata: "Q1", osmId: 1 });
    expect(f.geometry.coordinates).toHaveLength(1); // one polygon
    expect(f.geometry.coordinates[0]).toHaveLength(2); // outer + one hole
    expect(f.geometry.coordinates[0][1]).toEqual([[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]);
  });

  it("emits multiple outer polygons, largest first", () => {
    const rel = {
      type: "relation",
      id: 2,
      tags: {},
      members: [
        way("outer", [[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]), // small
        way("outer", [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]), // big
      ],
    } as unknown as OverpassRelation;

    const f = assembleRelation(rel)!;
    expect(f.geometry.coordinates).toHaveLength(2);
    // Largest-area polygon ranked first (so a hole nests into its tightest container).
    expect(f.geometry.coordinates[0][0][1]).toEqual([4, 0]);
    expect(f.properties.wikidata).toBeNull();
  });

  it("returns null when no outer ring has enough points", () => {
    const rel = {
      type: "relation",
      id: 3,
      tags: {},
      members: [way("outer", [[0, 0], [1, 0]])],
    } as unknown as OverpassRelation;
    expect(assembleRelation(rel)).toBeNull();
  });
});
