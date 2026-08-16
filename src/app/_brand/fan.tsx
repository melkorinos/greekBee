/**
 * The platform mark — three letter tiles fanned out (card 18 / icon 1, chosen by
 * the operator 2026-08-16, TICKET-10).
 *
 * This file is the ONE drawing. `opengraph-image.tsx`, `icon.tsx` and
 * `apple-icon.tsx` all render it at different sizes, so the favicon can never
 * drift away from the share card — the failure the candidates page was built to
 * avoid, and the reason every preview scaled one 180 px master rather than
 * redrawing per size.
 *
 * It is drawn in the flexbox subset satori understands, because that is the
 * renderer behind `next/og`. Two constraints that shaped the code:
 *
 *   1. **Paint order, not `z-index`.** The centre tile overlaps both flanks and
 *      must sit on top. satori honours document order and does not reliably
 *      honour `z-index`, so the tiles are positioned absolutely and the centre
 *      one is emitted LAST. Reordering this array changes the drawing.
 *   2. **Only the six free Greek glyphs.** The font `ImageResponse` ships covers
 *      Λ Ω λ μ π ω and nothing else — no accents, no final ς. Ω Λ π are all
 *      inside it, which is why this mark costs no committed font file. Any new
 *      letter here needs one (~350 KB), so check before changing a glyph.
 *
 * The folder is `_brand` — a leading underscore keeps Next from treating it as
 * a route segment.
 */
import type { ReactElement } from "react";

export const INK = "#1c1917";
export const GREEN = "#16a34a";
export const YELLOW = "#facc15";
export const TEAL = "#0d9488";
export const WHITE = "#ffffff";

/** The geometry of one fan, in pixels. Rotations and colours are fixed; only
 *  the sizes change between the card and the icon. */
export type FanSpec = {
  /** Edge of each flanking tile (green Ω, teal π). */
  side: number;
  /** Edge of the centre tile (yellow Λ) — deliberately the largest. */
  center: number;
  /** How far each flank tucks under the centre tile. */
  overlap: number;
  sideRadius: number;
  centerRadius: number;
  /** Letter size as a fraction of its tile. */
  fontRatio: number;
};

/** The card's fan, at true 1200×630 scale. */
export const CARD_FAN: FanSpec = {
  side: 190,
  center: 200,
  overlap: 18,
  sideRadius: 34,
  centerRadius: 36,
  fontRatio: 0.6,
};

/** The icon's fan, authored at the 180 px master size. Tighter than the card's:
 *  the tiles have to hold together inside a square, not across a banner. */
export const ICON_FAN: FanSpec = {
  side: 58,
  center: 64,
  overlap: 12,
  sideRadius: 12,
  centerRadius: 13,
  fontRatio: 0.62,
};

/** Every length in a spec multiplied by `k`. Used to take `ICON_FAN` from its
 *  180 px master down to 32 px, so the small icon is the big one scaled rather
 *  than a second drawing with its own rounding decisions. */
export function scaleFan(spec: FanSpec, k: number): FanSpec {
  return {
    side: spec.side * k,
    center: spec.center * k,
    overlap: spec.overlap * k,
    sideRadius: spec.sideRadius * k,
    centerRadius: spec.centerRadius * k,
    fontRatio: spec.fontRatio,
  };
}

/** Outer edge of the fan, so callers can centre it without guessing. */
export function fanWidth(spec: FanSpec): number {
  return spec.side * 2 + spec.center - spec.overlap * 2;
}

export function Fan({ spec }: { spec: FanSpec }): ReactElement {
  const { side, center, overlap, sideRadius, centerRadius, fontRatio } = spec;
  const width = fanWidth(spec);
  // Flanks are shorter than the centre tile, so they sit half the difference down.
  const sideTop = (center - side) / 2;

  // Order is load-bearing: the centre tile is last so it paints over both flanks.
  const tiles = [
    { left: 0, top: sideTop, size: side, radius: sideRadius, bg: GREEN, fg: WHITE, letter: "Ω", rotate: -9 },
    { left: side + center - overlap * 2, top: sideTop, size: side, radius: sideRadius, bg: TEAL, fg: WHITE, letter: "π", rotate: 11 },
    { left: side - overlap, top: 0, size: center, radius: centerRadius, bg: YELLOW, fg: INK, letter: "Λ", rotate: 3 },
  ];

  return (
    <div style={{ position: "relative", display: "flex", width, height: center }}>
      {tiles.map((t) => (
        <div
          key={t.letter}
          style={{
            position: "absolute",
            left: t.left,
            top: t.top,
            width: t.size,
            height: t.size,
            borderRadius: t.radius,
            background: t.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: t.fg,
            fontSize: t.size * fontRatio,
            fontWeight: 700,
            transform: `rotate(${t.rotate}deg)`,
          }}
        >
          {t.letter}
        </div>
      ))}
    </div>
  );
}

/** The mark as a square icon: the fan centred on the dark ground.
 *
 *  `radiusRatio` is a ratio rather than a constant because the two callers want
 *  different answers — a browser tab wants the rounded tile the operator picked,
 *  while iOS applies its own mask to `apple-icon` and a pre-rounded image shows
 *  as a rounded square inside a rounded square. apple-icon passes 0. */
export function FanIcon({ px, radiusRatio }: { px: number; radiusRatio: number }): ReactElement {
  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: px * radiusRatio,
        background: INK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Fan spec={scaleFan(ICON_FAN, px / 180)} />
    </div>
  );
}
