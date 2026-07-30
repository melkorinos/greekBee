// Λογοπαίγνιο — mark isolation geometry.
//
// Decides, for one staged asset, WHERE the symbol ends and the wordmark begins.
// Pure measurement: it never writes an image and never mutates _raw/. Callers
// turn the returned crop box into pixels (see build-logopaignio-marks.mjs).
//
// Two backends, one vocabulary:
//   SVG    - real geometry. Every drawable element's bounding box is read from a
//            headless browser via getBBox() + getScreenCTM(), so arcs, transforms
//            and nested <svg> all resolve exactly. 95 assets.
//   RASTER - no geometry exists, so we approximate it with an INK PROFILE: how
//            many non-background pixels sit in each column/row. 136 assets.
//
// Both then ask the same two questions:
//   1. Is there a gap wide enough to be a symbol/wordmark boundary?
//   2. If so, which side is the symbol?
//
// (2) is the part that took three attempts. Element count does NOT work - symbols
// are often many pieces (the AB Vassilopoulos box is 8, Metlen's starburst is 9).
// ASPECT RATIO does: a wordmark is wide by construction (text runs horizontally),
// a symbol is compact. On a hand-checked ground-truth set the symbol side measured
// 0.69-1.1 and the wordmark side 2.5-10.5 - no overlap, 10/10 correct.

/** A gap must span this fraction of the logo to count as a symbol/wordmark boundary. */
export const MIN_GAP_RATIO = 0.03;
/** Raster ink profiles are noisier than vector geometry, so they need a wider gap. */
export const MIN_GAP_RATIO_RASTER = 0.06;
/** Below this aspect-ratio difference the two sides look alike and a human must choose. */
export const AMBIGUOUS_DELTA = 0.8;
/** An element wider/taller than this fraction of the logo is a backdrop, not content. */
const SPANNER_RATIO = 0.8;

/**
 * Runs INSIDE the browser (serialised by Playwright). Returns every drawable
 * element's box in root-viewBox coordinates, plus the true content bounds.
 *
 * Deliberately ignores <defs>/<clipPath>/<mask>/<symbol>/<pattern> children:
 * they describe how other elements paint and are never drawn where they sit.
 */
export const EXTRACT_SVG_BOXES = () => {
  const root = document.querySelector("body > svg");
  if (!root) return null;
  const rootCTM = root.getScreenCTM();
  if (!rootCTM) return null;
  const inv = rootCTM.inverse();

  const boxes = [];
  const selector = "path,rect,circle,ellipse,polygon,polyline,use,text,image";
  for (const el of root.querySelectorAll(selector)) {
    if (el.closest("defs,clipPath,mask,symbol,pattern")) continue;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if (Number(style.opacity) === 0) continue;

    let bb;
    try {
      bb = el.getBBox();
    } catch {
      continue;
    }
    if (!bb || bb.width <= 0 || bb.height <= 0) continue;

    const ctm = el.getScreenCTM();
    if (!ctm) continue;
    // Local element space -> root viewBox space. Without this, <use> and grouped
    // glyphs report coordinates that fall outside the viewBox entirely.
    const toRoot = inv.multiply(ctm);
    const corners = [
      [bb.x, bb.y],
      [bb.x + bb.width, bb.y],
      [bb.x, bb.y + bb.height],
      [bb.x + bb.width, bb.y + bb.height],
    ].map(([x, y]) => {
      const pt = root.createSVGPoint();
      pt.x = x;
      pt.y = y;
      return pt.matrixTransform(toRoot);
    });
    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    boxes.push({
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    });
  }

  if (!boxes.length) return { content: null, boxes };
  const x0 = Math.min(...boxes.map((b) => b.x));
  const y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w));
  const y1 = Math.max(...boxes.map((b) => b.y + b.h));
  // Content bounds, not the declared viewBox: at least one asset in the pool
  // (olympic-airways) declares a viewBox its own artwork does not fit inside.
  return { content: [x0, y0, x1 - x0, y1 - y0], boxes };
};

/**
 * Widest empty band between boxes along one axis.
 * @param {Array<{x:number,y:number,w:number,h:number}>} boxes
 * @param {0|1} axis 0 = look for a vertical cut, 1 = a horizontal one
 * @param {[number,number,number,number]} content [x, y, w, h]
 * @returns {{ratio:number, at:number}|null} ratio is relative to content size
 */
export function widestGap(boxes, axis, content) {
  if (!boxes || boxes.length < 2) return null;
  const lo = axis ? "y" : "x";
  const size = axis ? "h" : "w";
  const span = content[axis + 2] || 1;

  const intervals = boxes
    .map((b) => [b[lo], b[lo] + b[size]])
    .sort((a, b) => a[0] - b[0]);

  let best = null;
  let reach = intervals[0][1];
  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    if (start > reach) {
      const width = start - reach;
      if (!best || width > best.width) best = { width, at: (reach + start) / 2 };
    }
    reach = Math.max(reach, end);
  }
  return best ? { ratio: best.width / span, at: best.at } : null;
}

/**
 * How symbol-like is this cluster of boxes? Lower wins.
 *
 * Pure aspect ratio. See the header note: element count is noise, elongation is
 * the signal, because a wordmark is a horizontal run of glyphs by construction.
 */
export function symbolScore(boxes) {
  if (!boxes || !boxes.length) return Number.POSITIVE_INFINITY;
  const x0 = Math.min(...boxes.map((b) => b.x));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w));
  const y0 = Math.min(...boxes.map((b) => b.y));
  const y1 = Math.max(...boxes.map((b) => b.y + b.h));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return Number.POSITIVE_INFINITY;
  return w / h;
}

/** Bounding box of a cluster, as [x, y, w, h]. */
export function bounds(boxes) {
  const x0 = Math.min(...boxes.map((b) => b.x));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w));
  const y0 = Math.min(...boxes.map((b) => b.y));
  const y1 = Math.max(...boxes.map((b) => b.y + b.h));
  return [x0, y0, x1 - x0, y1 - y0];
}

/**
 * Classify one asset from its measured boxes.
 *
 * @returns {{kind:string, cutAxis:0|1|null, cutAt:number|null,
 *            markBox:number[]|null, ambiguous:boolean}}
 *
 * kind is one of:
 *   horizontal - symbol beside the name; crop across x
 *   vertical   - symbol above/below the name; crop across y
 *   emblem     - compact, no gap: the name lives INSIDE the mark, or the asset is
 *                already symbol-only. Needs an eye, not a crop.
 *   wordmark   - wide, no gap: nothing to isolate. Fails the icon-only filter.
 */
export function classify(boxes, content, { minGap = MIN_GAP_RATIO } = {}) {
  const none = { kind: "wordmark", cutAxis: null, cutAt: null, markBox: null, ambiguous: false };
  if (!boxes || !boxes.length || !content) return none;

  const [, , W, H] = content;
  const width = W || 1;
  const height = H || 1;

  // A full-bleed backdrop bridges every gap, so gap-hunt without it as a fallback.
  const core = boxes.filter(
    (b) => b.w / width < SPANNER_RATIO && b.h / height < SPANNER_RATIO,
  );
  const gapX = widestGap(boxes, 0, content) ?? widestGap(core, 0, content);
  const gapY = widestGap(boxes, 1, content) ?? widestGap(core, 1, content);

  const useX = !!(gapX && gapX.ratio >= minGap);
  const useY = !useX && !!(gapY && gapY.ratio >= minGap);

  if (!useX && !useY) {
    // No boundary. Wide means it is all text; compact means it is an emblem.
    return { ...none, kind: width / height >= 2 ? "wordmark" : "emblem" };
  }

  const axis = useX ? 0 : 1;
  const cutAt = useX ? gapX.at : gapY.at;
  const lo = axis ? "y" : "x";
  const size = axis ? "h" : "w";
  const first = boxes.filter((b) => b[lo] + b[size] <= cutAt);
  const second = boxes.filter((b) => b[lo] >= cutAt);

  const scoreFirst = symbolScore(first);
  const scoreSecond = symbolScore(second);
  const pick = scoreFirst <= scoreSecond ? first : second;

  return {
    kind: useX ? "horizontal" : "vertical",
    cutAxis: axis,
    cutAt,
    markBox: pick.length ? bounds(pick) : null,
    // Both sides similarly proportioned => the rule cannot tell them apart.
    ambiguous: Math.abs(scoreFirst - scoreSecond) < AMBIGUOUS_DELTA,
  };
}

/**
 * Ink profile for a raster: per-column and per-row counts of non-background pixels.
 *
 * Background is taken from the corners. Two regimes, because the pool has both:
 * transparent-backed assets (alpha decides) and opaque ones (colour distance
 * decides). The alpha cutoff is deliberately high - anti-aliased edges otherwise
 * make every column non-empty and no gap is ever found.
 *
 * @param {{data:Buffer, info:{width:number,height:number,channels:number}}} raw
 */
export function inkProfile(raw) {
  const { data, info } = raw;
  const { width: W, height: H, channels: C } = info;
  const at = (i) => [data[i], data[i + 1], data[i + 2], data[i + 3]];
  const cornerOffsets = [0, W - 1, (H - 1) * W, (H - 1) * W + W - 1];
  const corners = cornerOffsets.map((o) => at(o * C));
  const alphaBackground = corners.every((c) => c[3] < 32);
  const bg = corners[0];

  const col = new Array(W).fill(0);
  const row = new Array(H).fill(0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      const alpha = data[i + 3];
      let ink;
      if (alphaBackground) {
        ink = alpha >= 128;
      } else {
        const dist =
          Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
        ink = alpha >= 128 && dist > 90;
      }
      if (ink) {
        col[x]++;
        row[y]++;
      }
    }
  }
  return { width: W, height: H, col, row, alphaBackground };
}

/**
 * Turn an ink profile axis into pseudo-boxes so `classify` can treat rasters and
 * vectors identically: each run of inked columns/rows becomes one box.
 */
export function profileToBoxes(profile) {
  const { col, row, width, height } = profile;
  const runs = (arr, cross) => {
    const threshold = Math.max(1, Math.floor(cross * 0.02));
    const out = [];
    let start = -1;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > threshold) {
        if (start < 0) start = i;
      } else if (start >= 0) {
        out.push([start, i]);
        start = -1;
      }
    }
    if (start >= 0) out.push([start, arr.length]);
    return out;
  };
  const xs = runs(col, height);
  const ys = runs(row, width);
  if (!xs.length || !ys.length) return { boxes: [], content: null };

  const x0 = xs[0][0];
  const x1 = xs[xs.length - 1][1];
  const y0 = ys[0][0];
  const y1 = ys[ys.length - 1][1];
  // One box per inked column-run, spanning the full inked height. Enough for gap
  // finding along x; the y case is handled by the transposed pass.
  const boxes = xs.map(([a, b]) => ({ x: a, y: y0, w: b - a, h: y1 - y0 }));
  const vBoxes = ys.map(([a, b]) => ({ x: x0, y: a, w: x1 - x0, h: b - a }));
  return { boxes, vBoxes, content: [x0, y0, x1 - x0, y1 - y0] };
}
