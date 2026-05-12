// wordleTheme.test.tsx — smoke tests for Wordle dark-theme classes.
// Tests render Tile and Keyboard in isolation (no game state needed)
// to verify that unconditional dark-theme classes are present.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Keyboard } from "@/components/wordle/Keyboard";
import { Tile } from "@/components/wordle/Tile";

// ── Tile ──────────────────────────────────────────────────────────────────────

describe("Tile dark theme classes", () => {
  it('empty tile has border-stone-600 (dark border)', () => {
    const { container } = render(<Tile state="empty" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("border-stone-600");
  });

  it('empty tile has text-stone-100 (dark foreground)', () => {
    const { container } = render(<Tile state="empty" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("text-stone-100");
  });

  it('pending tile has border-stone-500', () => {
    const { container } = render(<Tile state="pending" letter="α" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("border-stone-500");
  });

  it('correct tile has bg-green-600', () => {
    const { container } = render(<Tile state="correct" letter="α" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("bg-green-600");
  });
});

// ── Keyboard ──────────────────────────────────────────────────────────────────

describe("Keyboard dark theme classes", () => {
  const noop = () => {};
  const emptyStates = {};

  it("unknown key has bg-stone-700 (dark key background)", () => {
    render(
      <Keyboard
        letterStates={emptyStates}
        onLetter={noop}
        onDelete={noop}
        onEnter={noop}
      />
    );
    // All letter keys start as unknown — pick the first visible key
    const buttons = screen.getAllByRole("button");
    const letterButton = buttons.find((b) => b.textContent && b.textContent.trim().length === 1);
    expect(letterButton).toBeDefined();
    expect(letterButton!.className).toContain("bg-stone-700");
  });

  it("unknown key has text-stone-100", () => {
    render(
      <Keyboard
        letterStates={emptyStates}
        onLetter={noop}
        onDelete={noop}
        onEnter={noop}
      />
    );
    const buttons = screen.getAllByRole("button");
    const letterButton = buttons.find((b) => b.textContent && b.textContent.trim().length === 1);
    expect(letterButton!.className).toContain("text-stone-100");
  });

  it("correct key has bg-green-600", () => {
    const { container } = render(
      <Keyboard
        letterStates={{ α: "correct" }}
        onLetter={noop}
        onDelete={noop}
        onEnter={noop}
      />
    );
    const alphaButton = container.querySelector('[data-testid="key-α"]') as HTMLElement;
    expect(alphaButton).not.toBeNull();
    expect(alphaButton.className).toContain("bg-green-600");
  });
});
