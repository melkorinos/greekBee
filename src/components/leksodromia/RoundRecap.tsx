"use client";

// End-of-round recap — all 10 words with per-word outcome and points.

import type { LeksodromiaWordResult } from "@/games/leksodromia/types";

// The score heading lived here until ADR 0025: this recap is now the Result
// Panel's children, and the panel prints the score above it. Two headings meant
// the same number twice on one screen.

interface RoundRecapProps {
  results: LeksodromiaWordResult[];
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}″`;
}

export function RoundRecap({ results }: RoundRecapProps) {
  return (
    <div data-testid="round-recap" className="w-full max-w-game flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {results.map((r, i) => (
          <li
            key={`${r.word}-${i}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden>{r.status === "solved" ? "✅" : "⏭️"}</span>
              <span className="font-semibold uppercase tracking-wide text-foreground">
                {r.word}
              </span>
            </span>
            <span className="flex items-center gap-3 text-xs text-muted tabular-nums">
              {r.status === "solved" && <span>{formatSeconds(r.elapsedMs)}</span>}
              {r.hintsUsed > 0 && <span>💡×{r.hintsUsed}</span>}
              <span className="font-mono font-semibold text-foreground">{r.points}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
