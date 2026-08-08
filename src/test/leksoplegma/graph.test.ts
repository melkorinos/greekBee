// Leksoplegma graph lib — edge derivation, live-tile/edge collapse, trace validation.
// The graph lib is grid-agnostic: it works on the edge union of authored paths;
// 4×4 adjacency is a generator constraint, not a runtime one.

import { describe, it, expect } from "vitest";

import {
  edgeKey,
  edgesOf,
  liveTiles,
  liveEdges,
  isTraceValid,
} from "@/games/leksoplegma/lib/graph";

// Fixture: 3 required words on a tiny board.
//   "αβγ" → 0-1-2, "γδε" → 2-3-4, "εα" → 4-0
// Edge union: 0-1, 1-2, 2-3, 3-4, 0-4. Tiles 0..4 all used.
const PATHS: Record<string, number[]> = {
  αβγ: [0, 1, 2],
  γδε: [2, 3, 4],
  εα:  [4, 0],
};

describe("edgeKey", () => {
  it("canonicalises order — the graph is undirected", () => {
    expect(edgeKey(4, 0)).toBe(edgeKey(0, 4));
  });

  it("does not collide between distinct pairs like 1-12 and 11-2", () => {
    expect(edgeKey(1, 12)).not.toBe(edgeKey(11, 2));
  });
});

describe("edgesOf", () => {
  it("derives the undirected union of consecutive pairs across all paths", () => {
    const edges = edgesOf(PATHS);
    expect(edges).toEqual(
      new Set([edgeKey(0, 1), edgeKey(1, 2), edgeKey(2, 3), edgeKey(3, 4), edgeKey(4, 0)]),
    );
  });

  it("deduplicates edges shared by multiple paths", () => {
    const edges = edgesOf({ αβ: [0, 1], βα: [1, 0] });
    expect(edges).toEqual(new Set([edgeKey(0, 1)]));
  });
});

describe("liveTiles / liveEdges — the collapse rule", () => {
  it("with nothing found, every tile and edge of every required path is live", () => {
    expect(liveTiles(PATHS, [])).toEqual(new Set([0, 1, 2, 3, 4]));
    expect(liveEdges(PATHS, [])).toEqual(edgesOf(PATHS));
  });

  it("removes tiles and edges not needed by any remaining unfound required word", () => {
    // After finding αβγ, remaining paths are γδε (2-3-4) and εα (4-0):
    // tile 1 dies, edges 0-1 and 1-2 die; tiles 0,2 survive (still needed).
    expect(liveTiles(PATHS, ["αβγ"])).toEqual(new Set([0, 2, 3, 4]));
    expect(liveEdges(PATHS, ["αβγ"])).toEqual(
      new Set([edgeKey(2, 3), edgeKey(3, 4), edgeKey(4, 0)]),
    );
  });

  it("collapses to an empty board when all required words are found", () => {
    const all = Object.keys(PATHS);
    expect(liveTiles(PATHS, all)).toEqual(new Set());
    expect(liveEdges(PATHS, all)).toEqual(new Set());
  });

  it("ignores found entries that are not required words (bonus words never keep tiles alive)", () => {
    expect(liveTiles(PATHS, ["μπονους"])).toEqual(liveTiles(PATHS, []));
  });
});

describe("isTraceValid", () => {
  const live = edgesOf(PATHS);

  it("accepts a trace whose consecutive pairs are all live edges", () => {
    expect(isTraceValid([0, 1, 2], live)).toBe(true);
  });

  it("accepts a trace in either direction — edges are undirected", () => {
    expect(isTraceValid([2, 1, 0], live)).toBe(true);
  });

  it("rejects a trace using a non-existent edge", () => {
    expect(isTraceValid([0, 2], live)).toBe(false); // 0-2 was never drawn
  });

  it("rejects a trace over a collapsed (dead) edge", () => {
    const afterFound = liveEdges(PATHS, ["αβγ"]);
    expect(isTraceValid([0, 1, 2], afterFound)).toBe(false);
  });

  it("rejects tile reuse within a trace", () => {
    expect(isTraceValid([0, 1, 0], live)).toBe(false);
  });

  it("rejects traces shorter than two tiles", () => {
    expect(isTraceValid([], live)).toBe(false);
    expect(isTraceValid([3], live)).toBe(false);
  });
});
