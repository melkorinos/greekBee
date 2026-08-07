// board.test.tsx — TopothesiesBoard render + full play-through through the
// reducer seam: silhouette renders, a wrong guess yields a distance/arrow/
// proximity hint, a correct guess reveals the unit and opens the capital stage,
// and a correct capital finishes the round with a score + result panel.
// The identity/network stack is stubbed — out of scope here.

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TopothesiesBoard } from "@/components/topothesies/TopothesiesBoard";
import type { TopothesiesAnswer, TopothesiesShape } from "@/games/topothesies/types";
import { TOPOTHESIES } from "@/config/gameRules";

vi.mock("@/hooks/usePlayerIdentity", () => ({
  usePlayerIdentity: () => ({ deviceId: "", displayName: "", leaderboardProps: {} }),
}));
vi.mock("@/components/shared/GameLeaderboardModal", () => ({
  GameLeaderboardModal: () => null,
}));

const answer = (over: Partial<TopothesiesAnswer>): TopothesiesAnswer => ({
  id: "aa", name: "Αλφα", nameNormalized: "αλφα",
  capital: "Πρωτη", capitalNormalized: "πρωτη", capitalCoord: [23, 38],
  centroid: [23, 38], aliases: [], region: "Ρ", isIsland: false, ...over,
});

const TARGET = answer({});
const OTHER = answer({
  id: "bb", name: "Βητα", nameNormalized: "βητα",
  capital: "Δευτερη", capitalNormalized: "δευτερη", capitalCoord: [25, 40], centroid: [25, 40],
});
const ANSWERS = [TARGET, OTHER];
const SHAPE: TopothesiesShape = { id: "aa", path: "M0 0L10 0L10 10L0 10Z", viewBox: "0 0 10 10" };

function renderBoard() {
  return render(
    <TopothesiesBoard
      answers={ANSWERS}
      target={TARGET}
      shape={SHAPE}
      today="2026-07-21"
      maxKm={500}
      isLeaderboardOpen={false}
      onOpenLeaderboard={() => {}}
      onCloseLeaderboard={() => {}}
    />,
  );
}

async function guess(text: string) {
  const input = screen.getByRole("textbox");
  await userEvent.type(input, text);
  await userEvent.keyboard("{Enter}");
}

/** Accept a stage reveal (the "continue" gate drawn over the silhouette). */
async function acceptReveal(testId: string) {
  const reveal = await screen.findByTestId(testId);
  await userEvent.click(within(reveal).getByRole("button"));
}

describe("TopothesiesBoard", () => {
  it("renders the silhouette", () => {
    renderBoard();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("shows a distance/direction/proximity hint after a wrong guess", async () => {
    renderBoard();
    await guess("Βητα");
    const row = screen.getByTestId("shape-guesses");
    expect(row).toHaveTextContent("Βητα");
    expect(row).toHaveTextContent("χλμ"); // distance chip present
  });

  it("plays through both stages to a scored result", async () => {
    renderBoard();
    await guess("Βητα");      // wrong shape
    await guess("Αλφα");      // correct shape → shape reveal

    // The unit is revealed on top of the silhouette; accept it to reach the capital stage.
    const reveal = await screen.findByTestId("shape-reveal");
    expect(reveal).toHaveTextContent("Αλφα");
    await acceptReveal("shape-reveal");

    await guess("Πρωτη");     // correct capital → capital reveal
    await acceptReveal("capital-reveal");

    const result = screen.getByTestId("topothesies-result");
    expect(result).toBeInTheDocument();
    // Solved shape on the 2nd try (one wrong) + capital on the 1st (none wrong).
    const expected =
      TOPOTHESIES.POINTS_PER_SHAPE_GUESS_LEFT * (TOPOTHESIES.SHAPE_GUESSES - 1) +
      TOPOTHESIES.POINTS_PER_CAPITAL_GUESS_LEFT * TOPOTHESIES.CAPITAL_GUESSES;
    expect(result).toHaveTextContent(String(expected));
  });

  it("picking a dropdown row fills the box without submitting; the button commits", async () => {
    renderBoard();
    const input = screen.getByRole("textbox");
    await userEvent.click(input); // focus → full candidate list opens

    await userEvent.click(screen.getByRole("button", { name: "Βητα" }));
    // Picking a row only fills the input — no guess is recorded (mis-tap safe).
    expect(screen.queryByTestId("shape-guesses")).not.toBeInTheDocument();
    expect(input).toHaveValue("Βητα");

    // The explicit button is what actually commits the guess.
    await userEvent.click(screen.getByRole("button", { name: "Μάντεψε" }));
    expect(screen.getByTestId("shape-guesses")).toHaveTextContent("Βητα");
  });

  // Regression: committing with the button blurs the input, so restoring focus
  // fired onFocus and reopened the FULL candidate list — a scrolling panel of
  // every region, drawn straight over the board the player just guessed about.
  it("leaves the candidate list closed after a guess is committed with the button", async () => {
    renderBoard();
    const input = screen.getByRole("textbox");
    await userEvent.click(input);

    await userEvent.click(screen.getByRole("button", { name: "Βητα" }));
    await userEvent.click(screen.getByRole("button", { name: "Μάντεψε" }));

    // The guess landed, and no candidate row is on screen obscuring the map.
    expect(screen.getByTestId("shape-guesses")).toHaveTextContent("Βητα");
    expect(screen.queryByRole("button", { name: "Αλφα" })).not.toBeInTheDocument();
    // Focus is kept, so the next guess needs no extra tap to raise the keyboard.
    expect(input).toHaveFocus();
  });

  // The ref that suppresses that reopen must be spent by the event it was armed
  // for — otherwise it swallows the player's next deliberate tap on the input.
  it("still opens the list when the player taps the input again after a guess", async () => {
    renderBoard();
    const input = screen.getByRole("textbox");
    await userEvent.click(input);
    await userEvent.click(screen.getByRole("button", { name: "Βητα" }));
    await userEvent.click(screen.getByRole("button", { name: "Μάντεψε" }));

    // Leave the input, then come back to it the way a player would.
    await userEvent.click(screen.getByRole("img"));
    await userEvent.click(input);
    expect(screen.getByRole("button", { name: "Αλφα" })).toBeInTheDocument();
  });

  it("does not burn a guess on an unresolvable typo", async () => {
    renderBoard();
    await guess("ζζζζ"); // matches no candidate
    expect(screen.queryByTestId("shape-guesses")).not.toBeInTheDocument();
  });

  it("shows no distance hint on a wrong capital guess (right/wrong only)", async () => {
    renderBoard();
    await guess("Αλφα");   // correct shape → shape reveal
    await acceptReveal("shape-reveal");
    await guess("Δευτερη"); // wrong-but-known capital
    const rows = screen.getByTestId("capital-guesses");
    expect(rows).toHaveTextContent("Δευτερη");
    expect(rows).not.toHaveTextContent("χλμ"); // no distance chip in the capital stage
  });

  it("give-up reveals the answer and ends the round", async () => {
    renderBoard();
    await userEvent.click(screen.getByTestId("btn-give-up"));
    await userEvent.click(screen.getByTestId("btn-give-up-confirm"));
    const result = screen.getByTestId("topothesies-result");
    expect(result).toBeInTheDocument();
    expect(result).toHaveTextContent("Αλφα");   // the unit is revealed
    expect(result).toHaveTextContent("Πρωτη");  // and its capital
  });
});
