"use client";

// FeedbackMessage — brief toast-style message shown after each word submission.
// Auto-hides when the player types a new letter (lastSubmission resets via input change).

import {
  feedbackAlreadySuggestedClass,
  feedbackErrorClass,
  feedbackJustSuggestedClass,
  feedbackPangramClass,
  feedbackSuggestLinkClass,
  feedbackValidClass,
  feedbackValidContainer,
} from "./styles";

import type { ValidationStatus } from "@/games/leksokipos/types";

/** Human-readable messages for each validation outcome */
const MESSAGES: Record<ValidationStatus, string | ((word: string) => string)> = {
  valid:          "", // Handled separately (show the word + points)
  already_found:  "Already found!",
  too_short:      "Too short — 4 letters minimum",
  missing_center: "Must contain the centre letter",
  invalid_letter: "Not in letter list",
  not_in_list:    (word: string) => `${word.toUpperCase()} — not in word list`,
};

function getMessage(status: ValidationStatus, word: string): string {
  const msg = MESSAGES[status];
  return typeof msg === "function" ? msg(word) : msg;
}

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
      <div data-testid="feedback-valid" className={feedbackValidContainer}>
        {isPangram ? (
          <span data-testid="feedback-pangram" className={feedbackPangramClass}>
            🎉 Pangram! +{points} pts
          </span>
        ) : (
          <span data-testid="feedback-word-accepted" className={feedbackValidClass}>
            {word} +{points} pt{points !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }

  return (
    <div data-testid={`feedback-error-${status}`} className={feedbackErrorClass}>
      {getMessage(status, word)}
      {status === "not_in_list" && onSuggest && (
        <span className="ml-2">
          {justSuggested ? (
            <span
              data-testid="feedback-just-suggested"
              className={feedbackJustSuggestedClass}
            >
              «{word.toUpperCase()}» υποβλήθηκε ✓
            </span>
          ) : alreadySuggested ? (
            <span
              data-testid="feedback-already-suggested"
              className={feedbackAlreadySuggestedClass}
            >
              Ήδη υποβλήθηκε
            </span>
          ) : (
            <button
              onClick={onSuggest}
              data-testid="feedback-suggest-btn"
              className={feedbackSuggestLinkClass}
            >
              Πρότεινέ την →
            </button>
          )}
        </span>
      )}
    </div>
  );
}
