// feedbackMessage.test.tsx — unit tests for the FeedbackMessage component.
// Covers valid/pangram display, all error statuses, and the suggest-word
// inline link that appears only for not_in_list.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FeedbackMessage } from "@/components/spelling-bee/FeedbackMessage";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderFeedback(props: Parameters<typeof FeedbackMessage>[0]) {
  return render(<FeedbackMessage {...props} />);
}

// ── Valid word ─────────────────────────────────────────────────────────────────

describe("FeedbackMessage — valid word", () => {
  it("shows the word and points", () => {
    renderFeedback({ word: "αλφα", status: "valid", points: 1, isPangram: false });
    expect(screen.getByTestId("feedback-word-accepted")).toHaveTextContent("αλφα +1 pt");
  });

  it("pluralises pts for points > 1", () => {
    renderFeedback({ word: "παιδι", status: "valid", points: 5, isPangram: false });
    expect(screen.getByTestId("feedback-word-accepted")).toHaveTextContent("+5 pts");
  });

  it("shows pangram message for pangrams", () => {
    renderFeedback({ word: "παντελης", status: "valid", points: 14, isPangram: true });
    expect(screen.getByTestId("feedback-pangram")).toHaveTextContent("Pangram! +14 pts");
    expect(screen.queryByTestId("feedback-word-accepted")).toBeNull();
  });
});

// ── Error statuses ─────────────────────────────────────────────────────────────

describe("FeedbackMessage — error statuses", () => {
  it("shows already_found message", () => {
    renderFeedback({ word: "αλφα", status: "already_found", points: 0, isPangram: false });
    expect(screen.getByTestId("feedback-error-already_found")).toHaveTextContent("Already found!");
  });

  it("shows too_short message", () => {
    renderFeedback({ word: "αλ", status: "too_short", points: 0, isPangram: false });
    expect(screen.getByTestId("feedback-error-too_short")).toHaveTextContent("Too short");
  });

  it("shows missing_center message", () => {
    renderFeedback({ word: "πολυ", status: "missing_center", points: 0, isPangram: false });
    expect(screen.getByTestId("feedback-error-missing_center")).toHaveTextContent("centre letter");
  });

  it("shows not_in_list message", () => {
    renderFeedback({ word: "καλος", status: "not_in_list", points: 0, isPangram: false });
    expect(screen.getByTestId("feedback-error-not_in_list")).toHaveTextContent("Not in word list");
  });
});

// ── Suggest link ───────────────────────────────────────────────────────────────

describe("FeedbackMessage — suggest link (not_in_list only)", () => {
  it("shows suggest button for not_in_list when onSuggest is provided", () => {
    renderFeedback({
      word: "καλος", status: "not_in_list", points: 0, isPangram: false,
      onSuggest: vi.fn(),
    });
    expect(screen.getByTestId("feedback-suggest-btn")).toBeInTheDocument();
  });

  it("calls onSuggest when suggest button is clicked", async () => {
    const onSuggest = vi.fn();
    const user = userEvent.setup();
    renderFeedback({
      word: "καλος", status: "not_in_list", points: 0, isPangram: false,
      onSuggest,
    });
    await user.click(screen.getByTestId("feedback-suggest-btn"));
    expect(onSuggest).toHaveBeenCalledOnce();
  });

  it("shows 'Ήδη υποβλήθηκε' when alreadySuggested is true", () => {
    renderFeedback({
      word: "καλος", status: "not_in_list", points: 0, isPangram: false,
      onSuggest: vi.fn(),
      alreadySuggested: true,
    });
    expect(screen.queryByTestId("feedback-suggest-btn")).toBeNull();
    expect(screen.getByTestId("feedback-already-suggested")).toHaveTextContent("Ήδη υποβλήθηκε");
  });

  it("does NOT show suggest button for not_in_list when onSuggest is absent", () => {
    renderFeedback({ word: "καλος", status: "not_in_list", points: 0, isPangram: false });
    expect(screen.queryByTestId("feedback-suggest-btn")).toBeNull();
  });

  it("does NOT show suggest button for other error statuses even with onSuggest", () => {
    renderFeedback({
      word: "αλ", status: "too_short", points: 0, isPangram: false,
      onSuggest: vi.fn(),
    });
    expect(screen.queryByTestId("feedback-suggest-btn")).toBeNull();
  });
});
