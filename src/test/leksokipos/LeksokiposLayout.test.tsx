// Tests for LeksokiposLayout — variant toggle behaviour.
// The design panel (?design mode in FlowerGridPlayground) is NOT tested here
// because it is a developer tool, not a production feature.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock all child components to focus on layout-level behaviour.
// Vitest hoists vi.mock() calls before imports are executed.
vi.mock("@/components/leksokipos/GameBoard", () => ({
  GameBoard: ({ variant }: { variant?: "pie" | "flower" }) => (
    <div data-testid="mock-game-board" data-variant={variant ?? "pie"} />
  ),
}));
vi.mock("@/components/leksokipos/ShareButton", () => ({
  ShareButton: () => <div data-testid="mock-share-btn" />,
}));
vi.mock("@/components/leksokipos/NewPuzzleButton", () => ({
  NewPuzzleButton: () => <div data-testid="mock-new-puzzle-btn" />,
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

  it("renders the variant toggle, share, new-puzzle and how-to-play controls", () => {
    setup();
    expect(screen.getByRole("button", { name: /εναλλαγή σε/i })).toBeInTheDocument();
    expect(screen.getByTestId("mock-share-btn")).toBeInTheDocument();
    expect(screen.getByTestId("mock-new-puzzle-btn")).toBeInTheDocument();
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
