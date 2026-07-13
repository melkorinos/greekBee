"use client";

// End-of-round recap — all 10 words with per-word outcome and points.

import type { LeksodromiaWordResult } from "@/games/leksodromia/types";

interface RoundRecapProps {
  results:    LeksodromiaWordResult[];
  totalScore: number;
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}″`;
}

export function RoundRecap({ results, totalScore }: RoundRecapProps) {
  return (
    <div data-testid="round-recap" className="w-full max-w-sm flex flex-col gap-2">
      <h2 className="text-lg font-bold text-foreground text-center">
        Τέλος! 🏁 {totalScore} πόντοι
      </h2>
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
