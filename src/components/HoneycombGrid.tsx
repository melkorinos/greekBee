"use client";

// HoneycombGrid — renders the 7-hexagon playing board using inline SVG.
// Uses pointy-top hexagons so letters read naturally.
// Pure presentational component: receives letters and fires onLetterClick,
// all game logic stays in the hook.

import { memo } from "react";

// ── Layout constants ───────────────────────────────────────────────────────────

/** Circumradius of each hex (tip-to-centre distance) in SVG units */
const R = 50;

/** Display radius — slightly smaller than grid radius to create a visible gap */
const DISPLAY_R = 45;

/** Distance between two adjacent hex centres in a pointy-top grid = R * √3 */
const DIST = R * Math.sqrt(3);

/**
 * The 6 outer hex offsets relative to the centre hex (pointy-top grid).
 * Order: right → lower-right → lower-left → left → upper-left → upper-right
 */
const OUTER_OFFSETS: [number, number][] = [
  [DIST, 0], // right
  [DIST / 2, R * 1.5], // lower-right
  [-DIST / 2, R * 1.5], // lower-left
  [-DIST, 0], // left
  [-DIST / 2, -R * 1.5], // upper-left
  [DIST / 2, -R * 1.5], // upper-right
];

/** Builds the SVG `points` string for a pointy-top hexagon centred at (cx, cy) */
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    // Start angle at -90° so the first vertex points straight up
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");
}

// ── HexCell ────────────────────────────────────────────────────────────────────

interface HexCellProps {
  cx: number;
  cy: number;
  letter: string;
  /** True for the mandatory centre letter — rendered in a different colour */
  isCenter: boolean;
  onClickLetter: (letter: string) => void;
}

/** A single clickable hexagon cell with a letter label */
const HexCell = memo(function HexCell({
  cx,
  cy,
  letter,
  isCenter,
  onClickLetter,
}: HexCellProps) {
  return (
    <g
      onClick={() => onClickLetter(letter.toLowerCase())}
      className="cursor-pointer select-none"
      role="button"
      aria-label={`Letter ${letter.toUpperCase()}`}
    >
      <polygon
        points={hexPoints(cx, cy, DISPLAY_R)}
        className={
          isCenter
            ? // Centre hex: yellow/gold to stand out
              "fill-yellow-400 hover:fill-yellow-300 active:fill-yellow-500 transition-colors duration-100"
            : // Outer hexes: neutral stone
              "fill-stone-300 hover:fill-stone-200 active:fill-stone-400 transition-colors duration-100"
        }
      />
      {/* Letter label — pointer-events:none so clicks pass through to the <g> */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={22}
        fontWeight="bold"
        className="fill-stone-800 pointer-events-none uppercase"
      >
        {letter.toUpperCase()}
      </text>
    </g>
  );
});

// ── HoneycombGrid ──────────────────────────────────────────────────────────────

export interface HoneycombGridProps {
  /** The mandatory centre letter (must appear in every valid word) */
  centerLetter: string;
  /** The 6 outer letters — order determines which position each occupies */
  outerLetters: string[];
  /** Fired when the player clicks/taps a hex cell */
  onLetterClick: (letter: string) => void;
}

/**
 * Renders the 7-hexagon honeycomb board as a responsive inline SVG.
 * The SVG scales to its container — no fixed pixel size needed.
 */
export function HoneycombGrid({
  centerLetter,
  outerLetters,
  onLetterClick,
}: HoneycombGridProps) {
  return (
    <svg
      // ViewBox covers all 7 hexes + small padding on every side
      viewBox="-140 -130 280 260"
      className="w-full max-w-xs mx-auto"
      aria-label="Spelling Bee honeycomb grid"
    >
      {/* Outer hexes — rendered first so centre appears on top */}
      {outerLetters.slice(0, 6).map((letter, i) => {
        const [dx, dy] = OUTER_OFFSETS[i];
        return (
          <HexCell
            key={`outer-${i}`}
            cx={dx}
            cy={dy}
            letter={letter}
            isCenter={false}
            onClickLetter={onLetterClick}
          />
        );
      })}

      {/* Centre hex */}
      <HexCell
        cx={0}
        cy={0}
        letter={centerLetter}
        isCenter
        onClickLetter={onLetterClick}
      />
    </svg>
  );
}
