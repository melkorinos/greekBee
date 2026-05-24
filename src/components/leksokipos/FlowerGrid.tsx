"use client";

import { memo } from "react";

const CX = 150;
const CY = 150;

export interface FlowerGridConfig {
  variant: "pie" | "flower";
  // shared
  rCenter: number;
  segFontSize: number;
  centerFontSize: number;
  strokeWidth: number;
  showGradient: boolean;
  // pie-slice geometry
  rInner: number;
  rOuter: number;
  gapDeg: number;
  innerExtra: number;
  sideCurvature: number;
  // flower geometry
  petalLength: number;
  petalWidth: number;
  petalDist: number;
  petalRotation: number;
  // pie colors
  segFillColor: string;
  segStrokeColor: string;
  segTextColor: string;
  segGradStart: string;
  segGradEnd: string;
  // flower colors
  petalFillColor: string;
  petalStrokeColor: string;
  petalTextColor: string;
  petalGradStart: string;
  petalGradEnd: string;
  // center colors (shared)
  centerFillColor: string;
  centerStrokeColor: string;
  centerTextColor: string;
  centerGradStart: string;
  centerGradEnd: string;
}

export const DEFAULT_CONFIG: FlowerGridConfig = {
  variant: "pie",
  rCenter: 46,
  segFontSize: 24,
  centerFontSize: 26,
  strokeWidth: 1.5,
  showGradient: true,
  rInner: 52,
  rOuter: 140,
  gapDeg: 4,
  innerExtra: 3,
  sideCurvature: 0,
  petalLength: 55,
  petalWidth: 30,
  petalDist: 90,
  petalRotation: 0,
  segFillColor: "#DDD0BA",
  segStrokeColor: "#C4A882",
  segTextColor: "#5C4A35",
  segGradStart: "#D8C4A8",
  segGradEnd: "#EDE0CE",
  petalFillColor: "#A8D4B0",
  petalStrokeColor: "#7FB88A",
  petalTextColor: "#2D5A36",
  petalGradStart: "#C4EACC",
  petalGradEnd: "#72B882",
  centerFillColor: "#C4814F",
  centerStrokeColor: "#9E5538",
  centerTextColor: "#FFF5ED",
  centerGradStart: "#D4855A",
  centerGradEnd: "#B86844",
};

function sectorPath(
  outerStart: number, outerEnd: number,
  innerStart: number, innerEnd: number,
  cfg: FlowerGridConfig
): string {
  const { rInner, rOuter, sideCurvature } = cfg;
  const r = (d: number) => (d * Math.PI) / 180;
  const sOut = r(outerStart); const eOut = r(outerEnd);
  const sIn  = r(innerStart); const eIn  = r(innerEnd);
  const fmt = (n: number) => n.toFixed(2);

  const x1 = CX + rInner * Math.cos(sIn);
  const y1 = CY + rInner * Math.sin(sIn);
  const x2 = CX + rOuter * Math.cos(sOut);
  const y2 = CY + rOuter * Math.sin(sOut);
  const x3 = CX + rOuter * Math.cos(eOut);
  const y3 = CY + rOuter * Math.sin(eOut);
  const x4 = CX + rInner * Math.cos(eIn);
  const y4 = CY + rInner * Math.sin(eIn);

  if (sideCurvature === 0) {
    return [
      `M ${fmt(x1)},${fmt(y1)}`,
      `L ${fmt(x2)},${fmt(y2)}`,
      `A ${rOuter},${rOuter},0,0,1,${fmt(x3)},${fmt(y3)}`,
      `L ${fmt(x4)},${fmt(y4)}`,
      `A ${rInner},${rInner},0,0,0,${fmt(x1)},${fmt(y1)}`,
      "Z",
    ].join(" ");
  }

  const midR = (rInner + rOuter) / 2;
  const clx = CX + midR * Math.cos(r(outerStart - sideCurvature));
  const cly = CY + midR * Math.sin(r(outerStart - sideCurvature));
  const crx = CX + midR * Math.cos(r(outerEnd + sideCurvature));
  const cry = CY + midR * Math.sin(r(outerEnd + sideCurvature));

  return [
    `M ${fmt(x1)},${fmt(y1)}`,
    `Q ${fmt(clx)},${fmt(cly)} ${fmt(x2)},${fmt(y2)}`,
    `A ${rOuter},${rOuter},0,0,1,${fmt(x3)},${fmt(y3)}`,
    `Q ${fmt(crx)},${fmt(cry)} ${fmt(x4)},${fmt(y4)}`,
    `A ${rInner},${rInner},0,0,0,${fmt(x1)},${fmt(y1)}`,
    "Z",
  ].join(" ");
}

const SEGMENT_CENTERS_DEG = [0, 60, 120, 180, 240, 300];

interface SegmentProps {
  letter: string;
  centerDeg: number;
  onClickLetter: (letter: string) => void;
  cfg: FlowerGridConfig;
}

const Segment = memo(function Segment({ letter, centerDeg, onClickLetter, cfg }: SegmentProps) {
  const { rInner, rOuter, gapDeg, innerExtra, showGradient, segFontSize, strokeWidth,
          segFillColor, segStrokeColor, segTextColor } = cfg;
  const half = 30 - gapDeg / 2;
  const innerHalf = half - innerExtra;
  const d = sectorPath(centerDeg - half, centerDeg + half, centerDeg - innerHalf, centerDeg + innerHalf, cfg);
  const midR = (rInner + rOuter) / 2;
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
      <path
        d={d}
        fill={showGradient ? "url(#segGrad)" : segFillColor}
        stroke={segStrokeColor}
        strokeWidth={strokeWidth}
      />
      <text
        x={tx}
        y={ty}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={segFontSize}
        fontWeight={800}
        style={{ fill: segTextColor }}
        className="pointer-events-none uppercase"
      >
        {letter.toUpperCase()}
      </text>
    </g>
  );
});

interface FlowerPetalProps {
  letter: string;
  angleDeg: number;
  onClickLetter: (letter: string) => void;
  cfg: FlowerGridConfig;
}

const FlowerPetal = memo(function FlowerPetal({ letter, angleDeg, onClickLetter, cfg }: FlowerPetalProps) {
  const { petalDist, petalLength, petalWidth, petalRotation, showGradient, segFontSize, strokeWidth,
          petalFillColor, petalStrokeColor, petalTextColor } = cfg;
  const angle = angleDeg + petalRotation;
  const rad = (angle * Math.PI) / 180;
  const ex = CX + petalDist * Math.cos(rad);
  const ey = CY + petalDist * Math.sin(rad);

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
        drop-shadow-[0_2px_6px_rgba(50,100,60,0.25)]
        active:drop-shadow-none active:scale-95
        [transform-box:fill-box] origin-center
        transition-all duration-75"
    >
      <ellipse
        cx={ex}
        cy={ey}
        rx={petalLength}
        ry={petalWidth}
        transform={`rotate(${angle}, ${ex.toFixed(2)}, ${ey.toFixed(2)})`}
        fill={showGradient ? "url(#petalGrad)" : petalFillColor}
        stroke={petalStrokeColor}
        strokeWidth={strokeWidth}
      />
      <text
        x={ex}
        y={ey}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={segFontSize}
        fontWeight={800}
        style={{ fill: petalTextColor }}
        className="pointer-events-none uppercase"
      >
        {letter.toUpperCase()}
      </text>
    </g>
  );
});

interface CenterCellProps {
  letter: string;
  onClickLetter: (letter: string) => void;
  cfg: FlowerGridConfig;
}

const CenterCell = memo(function CenterCell({ letter, onClickLetter, cfg }: CenterCellProps) {
  const { rCenter, centerFontSize, showGradient, strokeWidth,
          centerFillColor, centerStrokeColor, centerTextColor } = cfg;
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
        r={rCenter}
        fill={showGradient ? "url(#centerGrad)" : centerFillColor}
        stroke={centerStrokeColor}
        strokeWidth={strokeWidth}
      />
      <text
        x={CX}
        y={CY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={centerFontSize}
        fontWeight={800}
        style={{ fill: centerTextColor }}
        className="pointer-events-none uppercase"
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
  config?: Partial<FlowerGridConfig>;
}

export function FlowerGrid({ centerLetter, outerLetters, onLetterClick, config }: FlowerGridProps) {
  const cfg: FlowerGridConfig = { ...DEFAULT_CONFIG, ...config };
  const innerStop = `${((cfg.rInner / cfg.rOuter) * 100).toFixed(0)}%`;

  return (
    <svg
      viewBox="0 0 300 300"
      className="w-full max-w-xs mx-auto"
      aria-label="Leksokipos grid"
    >
      <defs>
        <radialGradient id="segGrad" cx={CX} cy={CY} r={cfg.rOuter} gradientUnits="userSpaceOnUse">
          <stop offset={innerStop} stopColor={cfg.segGradStart} />
          <stop offset="100%" stopColor={cfg.segGradEnd} />
        </radialGradient>
        <radialGradient id="petalGrad" cx={CX} cy={CY} r={cfg.petalDist + cfg.petalLength} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={cfg.petalGradStart} />
          <stop offset="100%" stopColor={cfg.petalGradEnd} />
        </radialGradient>
        <radialGradient id="centerGrad" cx={CX} cy={CY} r={cfg.rCenter} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={cfg.centerGradStart} />
          <stop offset="100%" stopColor={cfg.centerGradEnd} />
        </radialGradient>
      </defs>

      {cfg.variant === "flower" && outerLetters.slice(0, 6).map((letter, i) => (
        <FlowerPetal
          key={`petal-${i}`}
          letter={letter}
          angleDeg={SEGMENT_CENTERS_DEG[i]}
          onClickLetter={onLetterClick}
          cfg={cfg}
        />
      ))}

      {cfg.variant === "pie" && outerLetters.slice(0, 6).map((letter, i) => (
        <Segment
          key={`seg-${i}`}
          letter={letter}
          centerDeg={SEGMENT_CENTERS_DEG[i]}
          onClickLetter={onLetterClick}
          cfg={cfg}
        />
      ))}

      <CenterCell letter={centerLetter} onClickLetter={onLetterClick} cfg={cfg} />
    </svg>
  );
}
