"use client";

// End-of-round recap — all required words with their points, any hint costs,
// and the final score.

import { LEKSOPLEGMA } from "@/config/gameRules";

interface LeksoplegmaRecapProps {
  /** Required words in discovery order (the round is over — all are found). */
  foundRequired: string[];
  hintsUsed:     string[];
  totalScore:    number;
}

export function LeksoplegmaRecap({
  foundRequired,
  hintsUsed,
  totalScore,
}: LeksoplegmaRecapProps) {
  return (
    <div data-testid="round-recap" className="w-full max-w-sm flex flex-col gap-2">
      <h2 className="text-lg font-bold text-foreground text-center">
        Το πλέγμα λύθηκε! 🕸️ {totalScore} πόντοι
      </h2>
      <ul className="flex flex-col gap-1">
        {foundRequired.map((word) => (
          <li
            key={word}
            className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden>{hintsUsed.includes(word) ? "💡" : "✅"}</span>
              <span className="font-semibold uppercase tracking-wide text-foreground">{word}</span>
            </span>
            <span className="font-mono font-semibold text-foreground text-xs tabular-nums">
              +{word.length * LEKSOPLEGMA.POINTS_PER_LETTER}
            </span>
          </li>
        ))}
      </ul>
      {hintsUsed.length > 0 && (
        <div className="flex flex-col gap-0.5 text-sm text-muted text-center">
          <p>
            Υποδείξεις: {hintsUsed.length}
            {" · "}
            <span className="font-mono">−{hintsUsed.length * LEKSOPLEGMA.HINT_COST_POINTS}</span>
          </p>
        </div>
      )}
    </div>
  );
}
