"use client";

import { memo } from "react";

const R = 50;
const DIST = R * Math.sqrt(3);
const CENTER_R = 40;

// Squircle dimensions — 1:1.5 aspect ratio, long axis points radially outward
const SW = 50;  // width (short axis before rotation)
const SH = 75;  // height (long axis before rotation)
const SR = 14;  // corner radius

const OUTER_OFFSETS: [number, number][] = [
  [DIST, 0],
  [DIST / 2, R * 1.5],
  [-DIST / 2, R * 1.5],
  [-DIST, 0],
  [-DIST / 2, -R * 1.5],
  [DIST / 2, -R * 1.5],
];

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
      className="cursor-pointer select-none drop-shadow-[0_2px_4px_rgba(100,60,20,0.18)] active:drop-shadow-none active:scale-95 [transform-box:fill-box] origin-center transition-all duration-75"
      role="button"
      aria-label={`Letter ${letter.toUpperCase()}`}
    >
      {isCenter ? (
        <circle
          cx={cx}
          cy={cy}
          r={CENTER_R}
          className="fill-[#C2724F] stroke-[#9E5538] stroke-2"
        />
      ) : (
        <rect
          x={-SW / 2}
          y={-SH / 2}
          width={SW}
          height={SH}
          rx={SR}
          ry={SR}
          transform={`translate(${cx}, ${cy}) rotate(${petalAngle(cx, cy)})`}
          className="fill-[#E5D5C0] stroke-[#C4A882] stroke-1"
        />
      )}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={isCenter ? 24 : 20}
        fontWeight="bold"
        className={`pointer-events-none uppercase ${isCenter ? "fill-[#FFF5ED]" : "fill-[#5C4A35]"}`}
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
