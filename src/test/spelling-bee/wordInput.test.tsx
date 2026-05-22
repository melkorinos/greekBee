// wordInput.test.tsx — unit tests for the WordInput component.
// Covers letter display, centre-letter highlighting, placeholder,
// and the conditional inline submit button.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { WordInput } from "@/components/spelling-bee/WordInput";
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
    // 'α' is index 1 — should have yellow class
    expect(tiles[1].className).toContain("yellow");
    // others should not
    expect(tiles[0].className).not.toContain("yellow");
  });
});

// ── Inline submit button ───────────────────────────────────────────────────────

describe("WordInput — inline submit button", () => {
  it("does NOT show the submit button when canSubmit is false", () => {
    render(<WordInput value="παι" centerLetter="α" onSubmit={vi.fn()} canSubmit={false} />);
    expect(screen.queryByTestId("btn-enter")).toBeNull();
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
