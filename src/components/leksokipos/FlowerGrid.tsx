"use client";

import { memo } from "react";

const CX = 150;
const CY = 150;
const R_INNER = 52;
const R_OUTER = 140;
const R_CENTER = 46;
const GAP_DEG = 4;

// Gradient stop at inner edge — segments start at R_INNER so the full visible
// radial range (inner→outer) gets the full gradient sweep
const INNER_STOP = `${((R_INNER / R_OUTER) * 100).toFixed(0)}%`; // "37%"

function sectorPath(startDeg: number, endDeg: number): string {
  const r = (d: number) => (d * Math.PI) / 180;
  const s = r(startDeg);
  const e = r(endDeg);
  const x1 = CX + R_INNER * Math.cos(s);
  const y1 = CY + R_INNER * Math.sin(s);
  const x2 = CX + R_OUTER * Math.cos(s);
  const y2 = CY + R_OUTER * Math.sin(s);
  const x3 = CX + R_OUTER * Math.cos(e);
  const y3 = CY + R_OUTER * Math.sin(e);
  const x4 = CX + R_INNER * Math.cos(e);
  const y4 = CY + R_INNER * Math.sin(e);
  const fmt = (n: number) => n.toFixed(2);
  return [
    `M ${fmt(x1)},${fmt(y1)}`,
    `L ${fmt(x2)},${fmt(y2)}`,
    `A ${R_OUTER},${R_OUTER},0,0,1,${fmt(x3)},${fmt(y3)}`,
    `L ${fmt(x4)},${fmt(y4)}`,
    `A ${R_INNER},${R_INNER},0,0,0,${fmt(x1)},${fmt(y1)}`,
    "Z",
  ].join(" ");
}

// right(0°), lower-right(60°), lower-left(120°), left(180°), upper-left(240°), upper-right(300°)
const SEGMENT_CENTERS_DEG = [0, 60, 120, 180, 240, 300];

interface SegmentProps {
  letter: string;
  centerDeg: number;
  onClickLetter: (letter: string) => void;
}

const Segment = memo(function Segment({ letter, centerDeg, onClickLetter }: SegmentProps) {
  const half = 30 - GAP_DEG / 2;
  const d = sectorPath(centerDeg - half, centerDeg + half);
  const midR = (R_INNER + R_OUTER) / 2;
  const rad = (centerDeg * Math.PI) / 180;
  const tx = CX + midR * Math.cos(rad);
  const ty = CY + midR * Math.sin(rad);

  return (
    <g
      onClick={() => onClickLetter(letter.toLowerCase())}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClickLetter(letter.toLowerCase());
      }}
      tabIndex={0}
      role="button"
      aria-label={`Letter ${letter.toUpperCase()}`}
      className="cursor-pointer select-none
        drop-shadow-[0_2px_6px_rgba(100,60,20,0.22)]
        active:drop-shadow-none active:scale-95
        [transform-box:fill-box] origin-center
        transition-all duration-75"
    >
      <path d={d} fill="url(#segGrad)" stroke="#C4A882" strokeWidth="1.5" />
      <text
        x={tx}
        y={ty}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={22}
        fontWeight="bold"
        className="fill-[#5C4A35] pointer-events-none uppercase"
      >
        {letter.toUpperCase()}
      </text>
    </g>
  );
});

interface CenterCellProps {
  letter: string;
  onClickLetter: (letter: string) => void;
}

const CenterCell = memo(function CenterCell({ letter, onClickLetter }: CenterCellProps) {
  return (
    <g
      onClick={() => onClickLetter(letter.toLowerCase())}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClickLetter(letter.toLowerCase());
      }}
      tabIndex={0}
      role="button"
      aria-label={`Letter ${letter.toUpperCase()}`}
      className="cursor-pointer select-none
        drop-shadow-[0_2px_6px_rgba(100,60,20,0.28)]
        active:drop-shadow-none active:scale-95
        [transform-box:fill-box] origin-center
        transition-all duration-75"
    >
      <circle
        cx={CX}
        cy={CY}
        r={R_CENTER}
        fill="url(#centerGrad)"
        stroke="#9E5538"
        strokeWidth="2"
      />
      <text
        x={CX}
        y={CY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={24}
        fontWeight="bold"
        className="fill-[#FFF5ED] pointer-events-none uppercase"
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
      viewBox="0 0 300 300"
      className="w-full max-w-xs mx-auto"
      aria-label="Leksokipos grid"
    >
      <defs>
        {/* Segment: warmer darker sand at inner edge → lighter at outer */}
        <radialGradient id="segGrad" cx={CX} cy={CY} r={R_OUTER} gradientUnits="userSpaceOnUse">
          <stop offset={INNER_STOP} stopColor="#D8C4A8" />
          <stop offset="100%" stopColor="#EDE0CE" />
        </radialGradient>
        {/* Center: brighter highlight at core → richer terracotta at edge */}
        <radialGradient id="centerGrad" cx={CX} cy={CY} r={R_CENTER} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D4855A" />
          <stop offset="100%" stopColor="#B86844" />
        </radialGradient>
      </defs>

      {outerLetters.slice(0, 6).map((letter, i) => (
        <Segment
          key={`seg-${i}`}
          letter={letter}
          centerDeg={SEGMENT_CENTERS_DEG[i]}
          onClickLetter={onLetterClick}
        />
      ))}
      <CenterCell letter={centerLetter} onClickLetter={onLetterClick} />
    </svg>
  );
}
