// TopothesiesSilhouette — renders one precomputed silhouette (ADR 0018).
//
// The geometry is a build-time SVG `d` string + its own `viewBox`; there is NO
// client-side projection and no geo library. Each shape self-frames to its own
// viewBox with preserveAspectRatio "meet", so a tiny island fills the box and
// stays guessable rather than rendering as a dot. Fill is the game accent token
// (theme-aware via [data-game="topothesies"]) — no literal palette, no inline hex.

import type { TopothesiesShape } from "@/games/topothesies/types";

interface TopothesiesSilhouetteProps {
  shape: TopothesiesShape;
  /** Accessible label — kept spoiler-free by the caller (never the answer name). */
  ariaLabel?: string;
}

export function TopothesiesSilhouette({ shape, ariaLabel = "Σχήμα" }: TopothesiesSilhouetteProps) {
  return (
    <svg
      viewBox={shape.viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      className="w-full h-full max-h-[42vh]"
    >
      <path
        d={shape.path}
        className="fill-game-accent stroke-surface"
        strokeWidth="0.2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        fillRule="evenodd"
      />
    </svg>
  );
}
