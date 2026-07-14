// Leksoplegma — pure letter-graph logic (no side effects, no React).
// The board is a graph: tiles (indices into the puzzle's letter string) joined
// by the undirected edges drawn along each required word's authored path.
// The collapse rule lives here — and collapse is SOFT: after a required word
// is found, tiles/edges still needed by a REMAINING unfound required word are
// "live" (bright); the rest dim but stay traceable, so extra words are never
// lost mid-round. liveTiles/liveEdges drive styling only; trace validation
// uses the full web (edgesOf(paths)). Bonus words never keep anything live —
// they ride on the required-edge graph.
//
// Grid-agnostic by design: 4×4 / 8-dir adjacency is a generator constraint;
// at runtime a trace is valid iff it walks authored edges.

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

/** Tiles still needed by at least one unfound required word (bright vs dim). */
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

/** Edges still needed by at least one unfound required word (bright vs dim). */
export function liveEdges(
  paths: Record<string, readonly number[]>,
  foundRequired: readonly string[],
): Set<string> {
  return edgesOf(remainingPaths(paths, foundRequired));
}

/**
 * True iff `trace` walks the given edge set: ≥ 2 tiles, no tile reused, and
 * every consecutive pair is an edge in the set (either direction). Callers
 * pass the FULL web (edgesOf(paths)) — soft collapse keeps dimmed edges legal.
 */
export function isTraceValid(trace: readonly number[], edges: ReadonlySet<string>): boolean {
  if (trace.length < 2) return false;
  if (new Set(trace).size !== trace.length) return false;
  for (let i = 1; i < trace.length; i++) {
    if (!edges.has(edgeKey(trace[i - 1], trace[i]))) return false;
  }
  return true;
}
