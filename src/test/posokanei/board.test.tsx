// board.test.tsx — PosokaneiBoard render + play-through through the reducer seam:
// the framed photo + item render, a wrong guess yields a direction/proximity
// hint, a correct guess finishes the round with a score + revealed price, and
// give-up reveals the price. The identity/network stack is stubbed.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PosokaneiBoard } from "@/components/posokanei/PosokaneiBoard";
import type { PosokaneiPuzzle } from "@/games/posokanei/types";
import { POSOKANEI } from "@/config/gameRules";

vi.mock("@/hooks/usePlayerIdentity", () => ({
  usePlayerIdentity: () => ({ deviceId: "", displayName: "", leaderboardProps: {} }),
}));
vi.mock("@/components/shared/GameLeaderboardModal", () => ({
  GameLeaderboardModal: () => null,
}));

const TARGET: PosokaneiPuzzle = {
  date: "2026-08-01", item: "Αγγούρι", itemType: "generic", unit: "τεμάχιο",
  price: 2.0, band: 0.1, photo: "/posokanei/sample.svg",
  photoSource: "Δείγμα", photoLicense: "Placeholder", sourceStore: "Δείγμα", sourceDate: "2026-08-01",
};

function renderBoard() {
  return render(
    <PosokaneiBoard
      target={TARGET}
      today="2026-08-01"
      isLeaderboardOpen={false}
      onOpenLeaderboard={() => {}}
      onCloseLeaderboard={() => {}}
    />,
  );
}

async function guess(text: string) {
  const input = screen.getByRole("textbox");
  await userEvent.clear(input);
  await userEvent.type(input, text);
  await userEvent.keyboard("{Enter}");
}

describe("PosokaneiBoard", () => {
  it("renders the framed product photo and item name", () => {
    renderBoard();
    expect(screen.getByRole("img")).toHaveAttribute("src", "/posokanei/sample.svg");
    expect(screen.getByText("Αγγούρι")).toBeInTheDocument();
  });

  it("shows 'πιο πάνω' when the guess is too low", async () => {
    renderBoard();
    await guess("1");
    const rows = screen.getByTestId("posokanei-guesses");
    expect(rows).toHaveTextContent("πιο πάνω");
    expect(rows).toHaveTextContent("%");
  });

  it("shows 'πιο κάτω' when the guess is too high", async () => {
    renderBoard();
    await guess("3");
    expect(screen.getByTestId("posokanei-guesses")).toHaveTextContent("πιο κάτω");
  });

  it("does not burn a guess on empty / non-positive input", async () => {
    renderBoard();
    await guess("0");
    expect(screen.queryByTestId("posokanei-guesses")).not.toBeInTheDocument();
  });

  it("plays through to a scored result on a correct guess", async () => {
    renderBoard();
    await guess("1");    // wrong (too low)
    await guess("2");    // correct → finished
    const result = screen.getByTestId("posokanei-result");
    expect(result).toBeInTheDocument();
    // Solved on the 2nd guess (one wrong).
    const expected = POSOKANEI.POINTS_PER_GUESS_LEFT * (POSOKANEI.MAX_GUESSES - 1);
    expect(result).toHaveTextContent(String(expected));
    expect(result).toHaveTextContent("2,00 €"); // the true price is revealed
  });

  it("give-up reveals the price and ends the round", async () => {
    renderBoard();
    await userEvent.click(screen.getByTestId("btn-give-up"));
    await userEvent.click(screen.getByTestId("btn-give-up-confirm"));
    const result = screen.getByTestId("posokanei-result");
    expect(result).toBeInTheDocument();
    expect(result).toHaveTextContent("2,00 €");
    expect(result).toHaveTextContent("Αγγούρι");
  });
});
