// Leksoplegma — pure letter-graph logic (no side effects, no React).
// The board is a graph: tiles (indices into the puzzle's letter string) joined
// by the undirected edges drawn along each required word's authored path.
// The collapse rule lives here: after a required word is found, only tiles and
// edges still needed by a REMAINING unfound required word stay alive. Bonus
// words never keep anything alive — they ride on the required-edge graph.
//
// Grid-agnostic by design: 4×4 / 8-dir adjacency is a generator constraint;
// at runtime a trace is valid iff it walks currently-live edges.

/** Canonical undirected edge key — same key for (a,b) and (b,a). */
export function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Undirected edge union of consecutive tile pairs across all given paths. */
export function edgesOf(paths: Record<string, readonly number[]>): Set<string> {
  const edges = new Set<string>();
  for (const path of Object.values(paths)) {
    for (let i = 1; i < path.length; i++) {
      edges.add(edgeKey(path[i - 1], path[i]));
    }
  }
  return edges;
}

/** Paths of required words not yet found. */
function remainingPaths(
  paths: Record<string, readonly number[]>,
  foundRequired: readonly string[],
): Record<string, readonly number[]> {
  const found = new Set(foundRequired);
  return Object.fromEntries(Object.entries(paths).filter(([word]) => !found.has(word)));
}

/** Tiles still needed by at least one unfound required word. */
export function liveTiles(
  paths: Record<string, readonly number[]>,
  foundRequired: readonly string[],
): Set<number> {
  const tiles = new Set<number>();
  for (const path of Object.values(remainingPaths(paths, foundRequired))) {
    for (const tile of path) tiles.add(tile);
  }
  return tiles;
}

/** Edges still needed by at least one unfound required word. */
export function liveEdges(
  paths: Record<string, readonly number[]>,
  foundRequired: readonly string[],
): Set<string> {
  return edgesOf(remainingPaths(paths, foundRequired));
}

/**
 * True iff `trace` walks live edges: ≥ 2 tiles, no tile reused, and every
 * consecutive pair is a currently-live edge (either direction).
 */
export function isTraceValid(trace: readonly number[], live: ReadonlySet<string>): boolean {
  if (trace.length < 2) return false;
  if (new Set(trace).size !== trace.length) return false;
  for (let i = 1; i < trace.length; i++) {
    if (!live.has(edgeKey(trace[i - 1], trace[i]))) return false;
  }
  return true;
}
