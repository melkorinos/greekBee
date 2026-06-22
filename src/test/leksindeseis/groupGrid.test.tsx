// leksindeseisGroupGrid.test.tsx — RTL smoke test for GroupGrid component.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { LeksindeseisGroup } from "@/games/leksindeseis/types";
import { GroupGrid } from "@/components/leksindeseis/GroupGrid";
import userEvent from "@testing-library/user-event";

const SOLVED_GROUP: LeksindeseisGroup = {
  category:   "Χρώματα",
  words:      ["κόκκινο", "μπλε", "πράσινο", "κίτρινο"],
  difficulty: 1,
};

const DISPLAY_ORDER = ["σκύλος", "γάτα", "άλογο", "ψάρι"];

describe("GroupGrid", () => {
  it("renders all unsolved words as buttons", () => {
    render(
      <GroupGrid
        displayOrder={DISPLAY_ORDER}
        currentSelection={[]}
        solvedGroups={[]}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    for (const word of DISPLAY_ORDER) {
      expect(screen.getByTestId(`word-card-${word}`)).toBeInTheDocument();
    }
  });

  it("renders solved groups as CategoryReveal bars (not word buttons)", () => {
    render(
      <GroupGrid
        displayOrder={DISPLAY_ORDER}
        currentSelection={[]}
        solvedGroups={[SOLVED_GROUP]}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    // CategoryReveal for the solved group exists
    expect(screen.getByTestId("category-reveal-1")).toBeInTheDocument();
    // Solved group words are NOT rendered as word buttons
    expect(screen.queryByTestId("word-card-κόκκινο")).not.toBeInTheDocument();
  });

  it("marks selected words with aria-pressed=true", () => {
    render(
      <GroupGrid
        displayOrder={DISPLAY_ORDER}
        currentSelection={["σκύλος"]}
        solvedGroups={[]}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    const dogCard = screen.getByTestId("word-card-σκύλος");
    expect(dogCard).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSelect when a word is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <GroupGrid
        displayOrder={DISPLAY_ORDER}
        currentSelection={[]}
        solvedGroups={[]}
        disabled={false}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByTestId("word-card-γάτα"));
    expect(onSelect).toHaveBeenCalledWith("γάτα");
  });

  it("does not call onSelect when disabled", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <GroupGrid
        displayOrder={DISPLAY_ORDER}
        currentSelection={[]}
        solvedGroups={[]}
        disabled={true}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByTestId("word-card-γάτα"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
