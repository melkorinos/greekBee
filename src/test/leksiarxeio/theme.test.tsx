// theme.test.tsx — semantic-token class assertions for Leksiarxeio Tile and Keyboard.
// Renders each component in isolation (no game state needed) and confirms the
// expected design tokens are applied (ADR 0008). Light/dark flips come from the
// tokens in globals.css, so components carry no dark:* variants.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve } from "path";

import { Keyboard } from "@/components/leksiarxeio/Keyboard";
import { Tile } from "@/components/leksiarxeio/Tile";

// ── Tile ──────────────────────────────────────────────────────────────────────

describe("Tile light theme classes", () => {
  it('empty tile has border-tile-border token', () => {
    const { container } = render(<Tile state="empty" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("border-tile-border");
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

  it("unknown key has bg-key-idle token", () => {
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
    expect(letterButton!.className).toContain("bg-key-idle");
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
// ── Keyboard key fills: eliminated must recede ───────────────────────────────
// One rule in both themes: the eliminated key is the DARKER fill. Dark mode had
// it backwards — the key borrowed --absent (stone-500) while an untouched key
// borrowed --border (stone-700), so used-up letters were the brightest thing on
// the keyboard. Hence --key-idle / --key-absent: the tiles keep --absent, which
// is a feedback colour and identical in both themes, and the keys get their own.
//
// This asserts the RELATIONSHIP, not the shades — a retune may pick any stone
// steps, as long as dark keeps --key-absent below --key-idle.

describe("Keyboard absent key", () => {
  const noop = () => {};

  it("uses the bg-key-absent token, not the shared bg-absent tile fill", () => {
    const { container } = render(
      <Keyboard
        letterStates={{ α: "absent" }}
        onLetter={noop}
        onDelete={noop}
        onEnter={noop}
      />
    );
    const alphaButton = container.querySelector('[data-testid="key-α"]') as HTMLElement;
    expect(alphaButton).not.toBeNull();
    expect(alphaButton.className).toContain("bg-key-absent");
  });
});

describe("keyboard key fill tokens (globals.css)", () => {
  const css = readFileSync(resolve(__dirname, "../../../src/app/globals.css"), "utf8");

  /** Body of the first `selector { … }` block in globals.css. */
  function block(selector: string): string {
    const start = css.indexOf(`${selector} {`);
    expect(start, `${selector} block not found in globals.css`).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf("\n}", start));
  }

  function value(selector: string, token: string): string {
    const hit = new RegExp(`${token}:\s*([^;]+);`).exec(block(selector));
    expect(hit, `${token} not declared in ${selector}`).not.toBeNull();
    return hit![1].trim();
  }

  /** Stone step of a `var(--color-stone-N)` value — higher N is darker. */
  function stoneStep(v: string): number {
    const hit = /--color-stone-(\d{2,4})\)/.exec(v);
    expect(hit, `expected a stone token, got "${v}"`).not.toBeNull();
    return Number(hit![1]);
  }

  it("light mode leaves both keys exactly as they were before the split", () => {
    expect(value(":root", "--key-idle")).toBe("var(--border)");
    expect(value(":root", "--key-absent")).toBe("var(--absent)");
  });

  it("dark mode paints the eliminated key darker than a key still in play", () => {
    const idle   = stoneStep(value(".dark", "--key-idle"));
    const absent = stoneStep(value(".dark", "--key-absent"));
    expect(absent).toBeGreaterThan(idle);
  });

  it("both tokens are exposed as utilities in @theme inline", () => {
    expect(css).toContain("--color-key-idle:");
    expect(css).toContain("--color-key-absent:");
  });
});
