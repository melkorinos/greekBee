// FramedMedia — the platform's framed media panel.
//
// A card-framed box that centres a single visual (an SVG silhouette, a product
// photo) so it reads as a deliberate panel rather than loose geometry floating
// in the column. The thick border is a step up from the usual hairline page
// margins. Graduated to shared/ when a second game (Πόσο κάνει;) needed the same
// frame topothesies drew inline — two genuine consumers, per the shared-component
// rule (CLAUDE.md).
//
// Purely presentational, no "use client" — safe in server or client trees.
// Owns colour/border/radius/centring; the caller supplies the visual and can add
// layout via `className`.

import type { ReactNode } from "react";

interface FramedMediaProps {
  children: ReactNode;
  /** Extra classes appended to the frame (e.g. a different min-height). */
  className?: string;
}

export function FramedMedia({ children, className }: FramedMediaProps) {
  return (
    <div
      className={`relative w-full flex items-center justify-center min-h-[42vh] rounded-card border-4 border-border bg-surface p-3${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </div>
  );
}
