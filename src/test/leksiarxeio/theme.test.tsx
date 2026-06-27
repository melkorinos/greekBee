// theme.test.tsx — semantic-token class assertions for Leksiarxeio Tile and Keyboard.
// Renders each component in isolation (no game state needed) and confirms the
// expected design tokens are applied (ADR 0008). Light/dark flips come from the
// tokens in globals.css, so components carry no dark:* variants.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Keyboard } from "@/components/leksiarxeio/Keyboard";
import { Tile } from "@/components/leksiarxeio/Tile";

// ── Tile ──────────────────────────────────────────────────────────────────────

describe("Tile light theme classes", () => {
  it('empty tile has border-border token', () => {
    const { container } = render(<Tile state="empty" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("border-border");
  });

  it('empty tile has text-foreground token', () => {
    const { container } = render(<Tile state="empty" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("text-foreground");
  });

  it('pending tile has border-muted token', () => {
    const { container } = render(<Tile state="pending" letter="α" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("border-muted");
  });

  it('correct tile has bg-correct token', () => {
    const { container } = render(<Tile state="correct" letter="α" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("bg-correct");
  });
});

// ── Keyboard ──────────────────────────────────────────────────────────────────

describe("Keyboard light theme classes", () => {
  const noop = () => {};
  const emptyStates = {};

  it("unknown key has bg-border token", () => {
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
    expect(letterButton!.className).toContain("bg-border");
  });

  it("unknown key has text-foreground token", () => {
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
    expect(letterButton!.className).toContain("text-foreground");
  });

  it("correct key has bg-correct token", () => {
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
    expect(alphaButton.className).toContain("bg-correct");
  });
});
// ── Keyboard responsive layout ───────────────────────────────────────────────
// Regression: row-2 had 9 keys × min-w-[2.5rem] = 360px+ which overflowed
// 360px viewports (Pixel 6), causing horizontal scroll, a dark left-edge strip,
// and fixed modals to appear shifted right.

describe("Keyboard responsive layout classes", () => {
  const noop = () => {};
  const emptyStates = {};

  function renderKeyboard() {
    return render(
      <Keyboard
        letterStates={emptyStates}
        onLetter={noop}
        onDelete={noop}
        onEnter={noop}
      />
    );
  }

  it("outer wrapper has w-full so it stretches to its container", () => {
    const { container } = renderKeyboard();
    const kb = container.querySelector('[aria-label="Keyboard"]') as HTMLElement;
    expect(kb).not.toBeNull();
    expect(kb.className).toContain("w-full");
  });

  it("no letter key has fixed min-w that caused overflow on 360px screens", () => {
    const { container } = renderKeyboard();
    const letterButtons = container.querySelectorAll('[data-testid^="key-"]');
    letterButtons.forEach((btn) => {
      expect(btn.className).not.toContain("min-w-[");
    });
  });

  it("all letter keys have flex-1 so they share row width proportionally", () => {
    const { container } = renderKeyboard();
    const letterButtons = container.querySelectorAll('[data-testid^="key-"]');
    expect(letterButtons.length).toBeGreaterThan(0);
    letterButtons.forEach((btn) => {
      expect(btn.className).toContain("flex-1");
    });
  });

  it("all letter keys have min-w-0 to allow shrinking below their content size", () => {
    const { container } = renderKeyboard();
    const letterButtons = container.querySelectorAll('[data-testid^="key-"]');
    letterButtons.forEach((btn) => {
      expect(btn.className).toContain("min-w-0");
    });
  });

  it("each row div has w-full so it spans the full keyboard width", () => {
    const { container } = renderKeyboard();
    // Row divs are direct children of the keyboard wrapper
    const kb = container.querySelector('[aria-label="Keyboard"]') as HTMLElement;
    const rows = Array.from(kb.children);
    expect(rows.length).toBe(3); // three keyboard rows
    rows.forEach((row) => {
      expect(row.className).toContain("w-full");
    });
  });

  it("Enter button has flex-1 and min-w-0 (shares row width with letter keys)", () => {
    const { getByTestId } = renderKeyboard();
    const enter = getByTestId("btn-enter");
    expect(enter.className).toContain("flex-1");
    expect(enter.className).toContain("min-w-0");
  });

  it("Delete button has flex-1 and min-w-0", () => {
    const { getByTestId } = renderKeyboard();
    const del = getByTestId("btn-delete");
    expect(del.className).toContain("flex-1");
    expect(del.className).toContain("min-w-0");
  });
});