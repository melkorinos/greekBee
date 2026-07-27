// board.test.tsx — LogopaignioBoard render + play-through through the reducer seam:
// the framed de-blurring mark + sector hint render, a wrong guess adds a history
// row and de-blurs the mark, a correct guess finishes the round with a score +
// revealed brand, blank input never burns a guess, and give-up reveals the brand.
// The identity/network stack is stubbed.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LogopaignioBoard } from "@/components/logopaignio/LogopaignioBoard";
import type { LogopaignioPuzzle } from "@/games/logopaignio/types";
import { LOGOPAIGNIO } from "@/config/gameRules";

vi.mock("@/hooks/usePlayerIdentity", () => ({
  usePlayerIdentity: () => ({ deviceId: "", displayName: "", leaderboardProps: {} }),
}));
vi.mock("@/components/shared/GameLeaderboardModal", () => ({
  GameLeaderboardModal: () => null,
}));

const TARGET: LogopaignioPuzzle = {
  id: "logopaignio-test",
  brand: "Κοσμοτε",
  sector: "Τηλεπικοινωνίες",
  accept: ["Κοσμοτε", "Cosmote"],
  markAsset: "/logopaignio/sample.svg",
};

function renderBoard() {
  return render(
    <LogopaignioBoard
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

describe("LogopaignioBoard", () => {
  it("renders the framed mark and the sector hint", () => {
    renderBoard();
    expect(screen.getByTestId("logopaignio-mark")).toHaveAttribute("src", "/logopaignio/sample.svg");
    expect(screen.getByText("Τηλεπικοινωνίες")).toBeInTheDocument();
  });

  it("blurs the mark before any guess and de-blurs after a wrong guess", async () => {
    renderBoard();
    const mark = screen.getByTestId("logopaignio-mark");
    expect(mark.style.filter).toBe(`blur(${LOGOPAIGNIO.BLUR_STEP_RADII_PX[0]}px)`);
    await guess("Λάθος");
    expect(mark.style.filter).toBe(`blur(${LOGOPAIGNIO.BLUR_STEP_RADII_PX[1]}px)`);
  });

  it("records a wrong guess without finishing the round", async () => {
    renderBoard();
    await guess("Λάθος");
    const rows = screen.getByTestId("logopaignio-guesses");
    expect(rows).toHaveTextContent("Λάθος");
    expect(screen.queryByTestId("logopaignio-result")).not.toBeInTheDocument();
  });

  it("does not burn a guess on blank / whitespace input", async () => {
    renderBoard();
    await guess("   ");
    expect(screen.queryByTestId("logopaignio-guesses")).not.toBeInTheDocument();
  });

  it("plays through to a scored result on a correct guess (Latin spelling accepted)", async () => {
    renderBoard();
    await guess("Λάθος");    // wrong
    await guess("cosmote");  // correct via accept-list, case/accent-insensitive
    const result = screen.getByTestId("logopaignio-result");
    expect(result).toBeInTheDocument();
    // Solved on the 2nd guess (one wrong).
    const expected = LOGOPAIGNIO.POINTS_PER_GUESS_LEFT * (LOGOPAIGNIO.MAX_GUESSES - 1);
    expect(result).toHaveTextContent(String(expected));
    expect(result).toHaveTextContent("Κοσμοτε"); // the brand is revealed
  });

  it("give-up reveals the brand and ends the round with zero points", async () => {
    renderBoard();
    await userEvent.click(screen.getByTestId("btn-give-up"));
    await userEvent.click(screen.getByTestId("btn-give-up-confirm"));
    const result = screen.getByTestId("logopaignio-result");
    expect(result).toBeInTheDocument();
    expect(result).toHaveTextContent("Κοσμοτε");
    expect(result).toHaveTextContent("0 πόντοι");
  });
});
