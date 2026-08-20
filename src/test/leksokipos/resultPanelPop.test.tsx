// resultPanelPop.test.tsx — Λεξόκηπος's Result Panel is a POP, and the header
// ShareButton is the way back to it (ADR 0025).
//
// The panel lives in the layout rather than the board precisely because of that
// button: the board is where the Rank and the live score are, the header is where
// the share control has always been, and only the layout sees both. Reaching the
// top Rank for real is GameBoard's own test (`roundEnd.test.tsx`); here the board
// is a stub that declares Round End on demand, so this file tests the wiring and
// nothing else.

import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import type { LeksokiposResult } from "@/components/leksokipos/GameBoard";

let declareResult: ((result: LeksokiposResult | null) => void) | null = null;

vi.mock("@/components/leksokipos/GameBoard", () => ({
  GameBoard: ({ onResultChange }: { onResultChange?: (r: LeksokiposResult | null) => void }) => {
    declareResult = onResultChange ?? null;
    return <div data-testid="mock-game-board" />;
  },
}));

import { LeksokiposLayout } from "@/components/leksokipos/LeksokiposLayout";

const PUZZLE: LeksokiposPuzzle = {
  id:           "2026-08-17-el",
  language:     "el",
  date:         "2026-08-17",
  centerLetter: "a",
  outerLetters: ["p", "i", "n", "t", "e", "d"],
  validWords:   ["anti", "paid", "paint"],
};

const RESULT: LeksokiposResult = { rank: "Απολυτότητα", score: 187, date: "2026-08-17" };

function renderLayout() {
  return render(
    <LeksokiposLayout puzzle={PUZZLE} canonicalPath="/leksokipos/a/deinpt" tooFewWords={false} />,
  );
}
describe("Leksokipos Layout — the Result Panel pop", () => {
  it("stays shut while there is no Round End", () => {
    renderLayout();
    expect(screen.queryByTestId("leksokipos-result")).toBeNull();
  });

  it("pops once Round End is reached, and can be dismissed", async () => {
    const user = userEvent.setup();
    renderLayout();

    await act(async () => declareResult!(RESULT));
    expect(screen.getByTestId("leksokipos-result")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Κλείσιμο" }));
    expect(screen.queryByTestId("leksokipos-result")).toBeNull();
  });

  it("does not pop a second time when the live score moves", async () => {
    const user = userEvent.setup();
    renderLayout();

    await act(async () => declareResult!(RESULT));
    await user.click(screen.getByRole("button", { name: "Κλείσιμο" }));

    await act(async () => declareResult!({ ...RESULT, score: 204 }));
    expect(screen.queryByTestId("leksokipos-result")).toBeNull();
  });

  it("reopens from the header share button, carrying the newer score", async () => {
    const user = userEvent.setup();
    renderLayout();

    await act(async () => declareResult!(RESULT));
    await user.click(screen.getByRole("button", { name: "Κλείσιμο" }));
    await act(async () => declareResult!({ ...RESULT, score: 204 }));

    await user.click(screen.getByTestId("btn-share"));
    expect(screen.getByTestId("leksokipos-result")).toHaveTextContent("204");
  });

  it("keeps the header button copying the board URL when there is no Round End", async () => {
    // userEvent.setup() installs a working clipboard stub, so this reads back what
    // the button actually wrote rather than asserting against a mock of our own.
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByTestId("btn-share"));

    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/leksokipos/a/deinpt`);
    expect(screen.queryByTestId("leksokipos-result")).toBeNull();
  });
});
