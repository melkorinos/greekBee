// osmPolygons.ts — assemble Overpass `out geom` administrative relations into
// GeoJSON polygons, with zero new dependencies.
//
// Overpass returns each boundary relation as a bag of member ways (role
// "outer"/"inner"/""), each way an ordered list of {lat,lon}. To draw or
// dissolve a shape we must stitch those ways into closed rings (ways meet at
// shared endpoints, in any order/direction) and nest inner rings (holes: lakes,
// enclaves) inside the outer ring that contains them. This is the standard OSM
// multipolygon assembly; we keep it in-repo rather than pull `osmtogeojson`
// (the by-hand generator already shells out to `npx mapshaper` for the heavy
// lifting — mapshaper cleans any residual ring noise downstream).

export type LngLat = [number, number];

interface OverpassMember {
  type: string;
  role: string;
  geometry?: { lat: number; lon: number }[];
}
export interface OverpassRelation {
  type: "relation";
  id: number;
  tags: Record<string, string>;
  members: OverpassMember[];
}

export interface AssembledFeature {
  properties: { shapeName: string; wikidata: string | null; osmId: number };
  geometry: { type: "MultiPolygon"; coordinates: LngLat[][][] };
}

const key = (p: LngLat): string => `${p[0]},${p[1]}`;
const closed = (r: LngLat[]): boolean => r.length > 2 && key(r[0]) === key(r[r.length - 1]);

/**
 * Stitch a set of way segments (each an ordered coordinate list) into closed
 * rings by matching endpoints. Segments already closed pass through; the rest
 * are greedily chained head-to-tail (reversing where needed) until they close
 * or run out of connectable neighbours (an open ring is still returned so the
 * caller/mapshaper can decide what to do with it).
 */
export function assembleRings(ways: LngLat[][]): LngLat[][] {
  const segs = ways.filter((w) => w.length >= 2).map((w) => w.slice());
  const used = new Array(segs.length).fill(false);
  const rings: LngLat[][] = [];

  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    let ring = segs[i].slice();
    while (!closed(ring)) {
      const tail = ring[ring.length - 1];
      let advanced = false;
      for (let j = 0; j < segs.length; j++) {
        if (used[j]) continue;
        const s = segs[j];
        if (key(s[0]) === key(tail)) {
          ring = ring.concat(s.slice(1));
          used[j] = true;
          advanced = true;
          break;
        }
        if (key(s[s.length - 1]) === key(tail)) {
          ring = ring.concat(s.slice(0, -1).reverse());
          used[j] = true;
          advanced = true;
          break;
        }
      }
      if (!advanced) break; // open ring — no connectable segment left
    }
    rings.push(ring);
  }
  return rings;
}

/** Shoelace signed area (in coordinate units²) — sign gives winding, |area| ranks size. */
export function signedRingArea(ring: LngLat[]): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Even-odd ray cast — is point inside ring? (holes nest into their container). */
function pointInRing(p: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * One Overpass relation → GeoJSON MultiPolygon. Outer rings become polygons;
 * inner rings (role "inner") are attached as holes to the smallest outer ring
 * that contains them. Rings that fail to close are still emitted as outers so no
 * geometry is silently dropped (mapshaper repairs them at dissolve time).
 */
export function assembleRelation(rel: OverpassRelation): AssembledFeature | null {
  const outerWays: LngLat[][] = [];
  const innerWays: LngLat[][] = [];
  for (const m of rel.members) {
    if (m.type !== "way" || !m.geometry) continue;
    const coords = m.geometry.map((g) => [g.lon, g.lat] as LngLat);
    (m.role === "inner" ? innerWays : outerWays).push(coords);
  }
  const outers = assembleRings(outerWays).filter((r) => r.length >= 4);
  const inners = assembleRings(innerWays).filter((r) => r.length >= 4);
  if (outers.length === 0) return null;

  // Largest-area outer first, so a hole nests into the tightest container.
  const ranked = outers
    .map((ring) => ({ ring, area: Math.abs(signedRingArea(ring)) }))
    .sort((a, b) => b.area - a.area);
  const polygons: LngLat[][][] = ranked.map(({ ring }) => [ring]);

  for (const hole of inners) {
    const probe = hole[0];
    let target = -1;
    let targetArea = Infinity;
    for (let k = 0; k < ranked.length; k++) {
      if (ranked[k].area < targetArea && pointInRing(probe, ranked[k].ring)) {
        target = k;
        targetArea = ranked[k].area;
      }
    }
    if (target >= 0) polygons[target].push(hole);
  }

  return {
    properties: {
      shapeName: rel.tags["name:el"] ?? rel.tags.name ?? "",
      wikidata: rel.tags.wikidata ?? null,
      osmId: rel.id,
    },
    geometry: { type: "MultiPolygon", coordinates: polygons },
  };
}

/** Assemble every relation in an Overpass `out geom` response. */
export function assembleOverpass(json: { elements: OverpassRelation[] }): AssembledFeature[] {
  return json.elements
    .filter((e) => e.type === "relation")
    .map(assembleRelation)
    .filter((f): f is AssembledFeature => f !== null);
}
