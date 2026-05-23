"use client";

import { memo } from "react";

const R = 50;
const DIST = R * Math.sqrt(3);

// Center circle radius — must equal the A-command radius in PETAL_PATH so the base
// arc maps to the exact same circle in SVG absolute coords after the rigid-body transform.
const CENTER_R = 40;

const OUTER_OFFSETS: [number, number][] = [
  [DIST, 0],
  [DIST / 2, R * 1.5],
  [-DIST / 2, R * 1.5],
  [-DIST, 0],
  [-DIST / 2, -R * 1.5],
  [DIST / 2, -R * 1.5],
];

// BASE_X controls petal width at the circle boundary (gap to adjacent petal ≈ 34 - BASE_X units).
//   Increase → petals fan wider at base, more base overlap hidden by center circle.
//   Decrease → thinner base, more "needle" shape near center.
// The body control (36 in the bezier below) sets max mid-petal width.
//   Increase → fatter/rounder petal body.   Decrease → slender/elongated.
// Tip y (-52) sets petal length.
//   More negative → longer petals, more spread.   Less negative → shorter, chubbier.
const BASE_X = 18;
const BASE_Y = +(DIST - Math.sqrt(CENTER_R ** 2 - BASE_X ** 2)).toFixed(1); // ≈ 50.9

// Single bezier per side keeps the path clean; the kink at the base corner (junction
// of bezier and arc) falls exactly on the circle boundary and is hidden by the
// center circle's 2-px stroke. No petal body overlap occurs outside r=40.
const PETAL_PATH = `M 0,-52 C 18,-52 36,5 ${BASE_X},${BASE_Y} A ${CENTER_R} ${CENTER_R} 0 0 0 -${BASE_X},${BASE_Y} C -36,5 -18,-52 0,-52 Z`;

function petalAngle(cx: number, cy: number): number {
  return Math.atan2(-cy, -cx) * (180 / Math.PI) - 90;
}

interface PetalCellProps {
  cx: number;
  cy: number;
  letter: string;
  isCenter: boolean;
  onClickLetter: (letter: string) => void;
}

const PetalCell = memo(function PetalCell({
  cx,
  cy,
  letter,
  isCenter,
  onClickLetter,
}: PetalCellProps) {
  return (
    <g
      onClick={() => onClickLetter(letter.toLowerCase())}
      className="cursor-pointer select-none"
      role="button"
      aria-label={`Letter ${letter.toUpperCase()}`}
    >
      {isCenter ? (
        <circle
          cx={cx}
          cy={cy}
          r={CENTER_R}
          className="fill-[#FFAA90] stroke-[#E0906C] stroke-2 active:fill-[#E8907A] active:scale-95 [transform-box:fill-box] origin-center transition-all duration-75"
        />
      ) : (
        <path
          d={PETAL_PATH}
          transform={`translate(${cx}, ${cy}) rotate(${petalAngle(cx, cy)})`}
          className="fill-[#A8DBBF] stroke-[#78C09A] stroke-2 active:fill-[#8FC9A9] active:scale-95 [transform-box:fill-box] origin-center transition-all duration-75"
        />
      )}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={22}
        fontWeight="bold"
        className="fill-stone-700 pointer-events-none uppercase"
      >
        {letter.toUpperCase()}
      </text>
    </g>
  );
});

export interface FlowerGridProps {
  centerLetter: string;
  outerLetters: string[];
  onLetterClick: (letter: string) => void;
}

export function FlowerGrid({ centerLetter, outerLetters, onLetterClick }: FlowerGridProps) {
  return (
    <svg
      viewBox="-150 -150 300 300"
      className="w-full max-w-xs mx-auto"
      aria-label="Leksokipos grid"
    >
      {outerLetters.slice(0, 6).map((letter, i) => {
        const [dx, dy] = OUTER_OFFSETS[i];
        return (
          <PetalCell
            key={`outer-${i}`}
            cx={dx}
            cy={dy}
            letter={letter}
            isCenter={false}
            onClickLetter={onLetterClick}
          />
        );
      })}
      <PetalCell
        cx={0}
        cy={0}
        letter={centerLetter}
        isCenter
        onClickLetter={onLetterClick}
      />
    </svg>
  );
}
