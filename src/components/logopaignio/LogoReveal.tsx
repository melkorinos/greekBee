// LogoReveal — the framed, progressively de-blurring company mark.
//
// The mark is shown name-stripped and blurred via CSS `filter: blur()`; each
// wrong guess steps it one level toward clear (radii from the gameRules ladder,
// picked by the pure blurRadiusForReveal), and a solved / given-up round shows it
// fully clear. Framed with the shared FramedMedia panel, like the topothesies
// silhouette and the posokanei photo.

import { blurRadiusForReveal } from "@/games/logopaignio/lib/blur";
import { FramedMedia } from "@/components/shared/FramedMedia";

interface LogoRevealProps {
  /** Public path to the name-stripped mark asset (SVG). */
  markAsset: string;
  /** How many wrong guesses so far — drives the de-blur step. */
  wrongGuesses: number;
  /** True once the round has ended (solved or given up) → fully clear. */
  revealed: boolean;
}

export function LogoReveal({ markAsset, wrongGuesses, revealed }: LogoRevealProps) {
  const radius = blurRadiusForReveal(wrongGuesses, revealed);

  return (
    <FramedMedia>
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset
          (SVG mark); next/image needs extra config for SVG and adds no value for a
          single small in-frame image. */}
      <img
        src={markAsset}
        alt="Λογότυπο προς μάντεμα"
        data-testid="logopaignio-mark"
        className="max-h-[32vh] w-auto max-w-full object-contain transition-[filter] duration-500"
        style={{ filter: radius > 0 ? `blur(${radius}px)` : undefined }}
      />
    </FramedMedia>
  );
}
