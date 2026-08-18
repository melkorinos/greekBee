// wordInput.test.tsx — unit tests for the WordInput component.
// Covers letter display, centre-letter highlighting, placeholder,
// and the always-rendered inline submit button (TICKET-16: it is disabled below
// the minimum word length rather than absent, so the player always has a target).

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { LEKSOKIPOS } from "@/config/gameRules";
import { WordInput } from "@/components/leksokipos/WordInput";
import userEvent from "@testing-library/user-event";

// ── Placeholder ────────────────────────────────────────────────────────────────

describe("WordInput — placeholder", () => {
  it("shows a placeholder when value is empty", () => {
    render(<WordInput value="" centerLetter="α" />);
    expect(screen.getByTestId("word-input")).toBeInTheDocument();
    expect(screen.queryAllByTestId("word-input-letter")).toHaveLength(0);
  });
});

// ── Letter display ─────────────────────────────────────────────────────────────

describe("WordInput — letter display", () => {
  it("renders each letter as an uppercase tile", () => {
    render(<WordInput value="αλφα" centerLetter="α" />);
    const tiles = screen.getAllByTestId("word-input-letter");
    expect(tiles).toHaveLength(4);
    expect(tiles[0]).toHaveTextContent("Α");
    expect(tiles[1]).toHaveTextContent("Λ");
  });

  it("applies centre-letter style to tiles matching the centre", () => {
    render(<WordInput value="παιντ" centerLetter="α" />);
    const tiles = screen.getAllByTestId("word-input-letter");
    // 'α' is index 1 — should have the centre-letter accent token
    expect(tiles[1].className).toContain("text-accent");
    // others should not
    expect(tiles[0].className).not.toContain("text-accent");
  });
});

// ── Inline submit button ───────────────────────────────────────────────────────

describe("WordInput — inline submit button", () => {
  it("renders the submit button DISABLED when canSubmit is false", () => {
    render(<WordInput value="παι" centerLetter="α" onSubmit={vi.fn()} canSubmit={false} />);
    expect(screen.getByTestId("btn-enter")).toBeDisabled();
  });

  it("does not call onSubmit when the disabled button is clicked", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    // Below the minimum length — the button is present but must not fire.
    render(
      <WordInput
        value={"α".repeat(LEKSOKIPOS.MIN_WORD_LENGTH - 1)}
        centerLetter="α"
        onSubmit={onSubmit}
        canSubmit={false}
      />,
    );
    await user.click(screen.getByTestId("btn-enter"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders the submit button ENABLED at exactly MIN_WORD_LENGTH", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <WordInput
        value={"α".repeat(LEKSOKIPOS.MIN_WORD_LENGTH)}
        centerLetter="α"
        onSubmit={onSubmit}
        canSubmit={true}
      />,
    );
    const btn = screen.getByTestId("btn-enter");
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("draws the check as an svg, with no visible text in the button", () => {
    render(<WordInput value="παιντ" centerLetter="α" onSubmit={vi.fn()} canSubmit={true} />);
    const btn = screen.getByTestId("btn-enter");
    expect(btn.querySelector("svg")).not.toBeNull();
    expect(btn.textContent).toBe("");
    expect(btn).toHaveAccessibleName("Καταχώρηση");
  });

  it("does NOT show the submit button when onSubmit is absent even if canSubmit is true", () => {
    render(<WordInput value="παιντ" centerLetter="α" canSubmit={true} />);
    expect(screen.queryByTestId("btn-enter")).toBeNull();
  });

  it("shows the submit button when canSubmit is true and onSubmit is provided", () => {
    render(<WordInput value="παιντ" centerLetter="α" onSubmit={vi.fn()} canSubmit={true} />);
    expect(screen.getByTestId("btn-enter")).toBeInTheDocument();
  });

  it("calls onSubmit when the submit button is clicked", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<WordInput value="παιντ" centerLetter="α" onSubmit={onSubmit} canSubmit={true} />);
    await user.click(screen.getByTestId("btn-enter"));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
