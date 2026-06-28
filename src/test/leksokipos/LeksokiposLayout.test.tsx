// Tests for LeksokiposLayout — variant toggle behaviour.
// The design panel (?design mode in FlowerGridPlayground) is NOT tested here
// because it is a developer tool, not a production feature.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock all child components to focus on layout-level behaviour.
// Vitest hoists vi.mock() calls before imports are executed.
vi.mock("@/components/leksokipos/GameBoard", () => ({
  GameBoard: ({ variant, puzzle }: { variant?: "pie" | "flower"; puzzle: { id: string } }) => (
    <div data-testid="mock-game-board" data-variant={variant ?? "pie"} data-puzzle-id={puzzle.id} />
  ),
}));
vi.mock("@/components/leksokipos/ShareButton", () => ({
  ShareButton: () => <div data-testid="mock-share-btn" />,
}));
vi.mock("@/components/leksokipos/HowToPlayModal", () => ({
  HowToPlayModal: () => <div data-testid="mock-how-to-play" />,
}));

import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { LeksokiposLayout } from "@/components/leksokipos/LeksokiposLayout";

// ── Fixture ───────────────────────────────────────────────────────────────────

const puzzle: LeksokiposPuzzle = {
  id: "test-layout",
  language: "el",
  date: "2026-01-01",
  centerLetter: "a",
  outerLetters: ["p", "i", "n", "t", "e", "d"],
  validWords: ["anti", "paid", "paint"],
};

const defaultProps = {
  puzzle,
  recentPuzzleDates: [] as string[],
  canonicalPath: "/leksokipos/a/pinted",
  tooFewWords: false,
};

function setup(overrides: Partial<typeof defaultProps> = {}) {
  const user = userEvent.setup();
  render(<LeksokiposLayout {...defaultProps} {...overrides} />);
  return { user };
}

// ── Header ────────────────────────────────────────────────────────────────────

describe("LeksokiposLayout — header", () => {
  it("renders the Leksokipos heading", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Leksokipos");
  });

  it("renders the variant toggle, share and how-to-play controls", () => {
    setup();
    expect(screen.getByRole("button", { name: /εναλλαγή σε/i })).toBeInTheDocument();
    expect(screen.getByTestId("mock-share-btn")).toBeInTheDocument();
    expect(screen.getByTestId("mock-how-to-play")).toBeInTheDocument();
  });
});

// ── Variant toggle ────────────────────────────────────────────────────────────

describe("LeksokiposLayout — variant toggle", () => {
  it("defaults to pie — toggle shows 🌸 (switch to flower)", () => {
    setup();
    const btn = screen.getByRole("button", { name: "Εναλλαγή σε Λουλούδι" });
    expect(btn).toHaveTextContent("🌸");
  });

  it("clicking toggle switches to flower — shows 🥧 (switch back to pie)", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Εναλλαγή σε Λουλούδι" }));
    const btn = screen.getByRole("button", { name: "Εναλλαγή σε Τάρτα" });
    expect(btn).toHaveTextContent("🥧");
  });

  it("saves 'flower' to localStorage after first click", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Εναλλαγή σε Λουλούδι" }));
    expect(localStorage.getItem("leksokipos-variant")).toBe("flower");
  });

  it("clicking toggle twice saves 'pie' back to localStorage", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Εναλλαγή σε Λουλούδι" }));
    await user.click(screen.getByRole("button", { name: "Εναλλαγή σε Τάρτα" }));
    expect(localStorage.getItem("leksokipos-variant")).toBe("pie");
  });

  it("restores flower variant from localStorage on mount", () => {
    localStorage.setItem("leksokipos-variant", "flower");
    setup();
    const btn = screen.getByRole("button", { name: "Εναλλαγή σε Τάρτα" });
    expect(btn).toHaveTextContent("🥧");
  });

  it("ignores unknown localStorage values and defaults to pie", () => {
    localStorage.setItem("leksokipos-variant", "hexagonal");
    setup();
    expect(screen.getByRole("button", { name: "Εναλλαγή σε Λουλούδι" })).toHaveTextContent("🌸");
  });

  it("passes the active variant to GameBoard", async () => {
    const { user } = setup();
    expect(screen.getByTestId("mock-game-board")).toHaveAttribute("data-variant", "pie");
    await user.click(screen.getByRole("button", { name: "Εναλλαγή σε Λουλούδι" }));
    expect(screen.getByTestId("mock-game-board")).toHaveAttribute("data-variant", "flower");
  });
});

// ── Puzzle key (remount guard) ────────────────────────────────────────────────
// key={puzzle.id} on GameBoard ensures React remounts the component — and resets
// all hook state — whenever the active puzzle changes. Without this, navigating
// between daily puzzles in the same route leaves givenUp/foundWords stale.

describe("LeksokiposLayout — puzzle key", () => {
  it("passes puzzle.id as a data attribute to GameBoard", () => {
    setup();
    expect(screen.getByTestId("mock-game-board")).toHaveAttribute("data-puzzle-id", puzzle.id);
  });

  it("mounts a fresh GameBoard (different DOM node) when puzzle.id changes", () => {
    const puzzle2 = { ...puzzle, id: "different-puzzle-id", date: "2026-01-02" };
    const { rerender } = render(<LeksokiposLayout {...defaultProps} />);
    const board1 = screen.getByTestId("mock-game-board");

    rerender(<LeksokiposLayout {...defaultProps} puzzle={puzzle2} canonicalPath="/leksokipos/a/pinted2" />);
    const board2 = screen.getByTestId("mock-game-board");

    // key={puzzle.id} forces a remount — the DOM element is a different object.
    // Without the key prop React would reuse the same element (board1 === board2).
    expect(board1).not.toBe(board2);
    expect(board2).toHaveAttribute("data-puzzle-id", puzzle2.id);
  });
});

// ── tooFewWords warning ───────────────────────────────────────────────────────

describe("LeksokiposLayout — tooFewWords warning", () => {
  it("shows the warning when tooFewWords is true", () => {
    setup({ tooFewWords: true });
    expect(screen.getByText(/very few valid words/i)).toBeInTheDocument();
  });

  it("does not show the warning when tooFewWords is false", () => {
    setup({ tooFewWords: false });
    expect(screen.queryByText(/very few valid words/i)).toBeNull();
  });
});
