"use client";

// FeedbackMessage — brief toast-style message shown after each word submission.
// Auto-hides when the player types a new letter (lastSubmission resets via input change).

import type { ValidationStatus } from "@/games/spelling-bee/types";

/** Human-readable messages for each validation outcome */
const MESSAGES: Record<ValidationStatus, string> = {
  valid:          "", // Handled separately (show the word + points)
  already_found:  "Already found!",
  too_short:      "Too short — 4 letters minimum",
  missing_center: "Must contain the centre letter",
  invalid_letter: "Not in letter list",
  not_in_list:    "Not in word list",
};

interface FeedbackMessageProps {
  word:              string;
  status:            ValidationStatus;
  points:            number;
  isPangram:         boolean;
  /** Called when the player clicks "Πρότεινέ την →" — only supplied for not_in_list */
  onSuggest?:        () => void;
  /** When true, shows "Ήδη υποβλήθηκε" instead of the suggest link */
  alreadySuggested?: boolean;
  /** When true, shows "«ΛΕΞΗ» υποβλήθηκε ✓" — takes priority over alreadySuggested */
  justSuggested?:    boolean;
}

// ── Class constants ──────────────────────────────────────────────────────────
const styles = {
  validContainer:  "flex items-center gap-2 text-sm font-semibold",
  pangramMessage:  "text-yellow-600 uppercase tracking-wide",
  validMessage:    "text-green-600 uppercase tracking-wide",
  errorMessage:    "text-sm font-medium text-red-500",
};

export function FeedbackMessage({
  word,
  status,
  points,
  isPangram,
  onSuggest,
  alreadySuggested = false,
  justSuggested    = false,
}: FeedbackMessageProps) {
  if (status === "valid") {
    return (
      <div data-testid="feedback-valid" className={styles.validContainer}>
        {isPangram ? (
          // Pangram gets a special golden celebration message
          <span data-testid="feedback-pangram" className={styles.pangramMessage}>
            🎉 Pangram! +{points} pts
          </span>
        ) : (
          <span data-testid="feedback-word-accepted" className={styles.validMessage}>
            {word} +{points} pt{points !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }

  return (
    <div data-testid={`feedback-error-${status}`} className={styles.errorMessage}>
      {MESSAGES[status]}
      {status === "not_in_list" && onSuggest && (
        <span className="ml-2">
          {justSuggested ? (
            <span
              data-testid="feedback-just-suggested"
              className="text-xs text-green-600 font-medium"
            >
              «{word.toUpperCase()}» υποβλήθηκε ✓
            </span>
          ) : alreadySuggested ? (
            <span
              data-testid="feedback-already-suggested"
              className="text-xs text-stone-400"
            >
              Ήδη υποβλήθηκε
            </span>
          ) : (
            <button
              onClick={onSuggest}
              data-testid="feedback-suggest-btn"
              className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800 transition-colors"
            >
              Πρότεινέ την →
            </button>
          )}
        </span>
      )}
    </div>
  );
}
