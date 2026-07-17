"use client";

// End-of-round recap — all required words with their points, any extra words
// found, any hint costs, and the final score.

import { LEKSOPLEGMA } from "@/config/gameRules";

interface LeksoplegmaRecapProps {
  /** Required words in discovery order (the round is over — all are found). */
  foundRequired: string[];
  /** Extra words found — flat points each, never needed to finish. */
  foundBonus:    string[];
  hintsUsed:     string[];
  totalScore:    number;
}

export function LeksoplegmaRecap({
  foundRequired,
  foundBonus,
  hintsUsed,
  totalScore,
}: LeksoplegmaRecapProps) {
  return (
    <div data-testid="round-recap" className="w-full max-w-game flex flex-col gap-2">
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
      {foundBonus.length > 0 && (
        <div data-testid="recap-bonus" className="flex flex-col gap-1 text-sm">
          <p className="text-center text-muted">
            Έξτρα λέξεις: {foundBonus.length}
            {" · "}
            <span className="font-mono">+{foundBonus.length * LEKSOPLEGMA.BONUS_WORD_POINTS}</span>
          </p>
          <ul className="flex flex-wrap gap-1.5 justify-center">
            {foundBonus.map((word) => (
              <li
                key={word}
                className="px-2 py-1 rounded-full border border-border bg-surface text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {word}
              </li>
            ))}
          </ul>
        </div>
      )}
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
