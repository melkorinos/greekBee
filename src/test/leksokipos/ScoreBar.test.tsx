// ScoreBar — the endgame "new content" cue.
//
// Reaching the top rank swaps the rank-ladder popup for the Endgame panel. The
// ladder icon pulses (data-endgame-cue) so the player notices there is new content
// behind it, and the pulse clears the first time they open the panel.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ScoreBar } from "@/components/leksokipos/ScoreBar";
import { RANKS, TOP_RANK } from "@/games/leksokipos/lib";
import type { EndgameInfo } from "@/games/leksokipos/lib";

const endgame: EndgameInfo = {
  remainingTotal:    3,
  remainingPangrams: 1,
  byLength:          [{ length: 4, count: 3 }],
};

describe("ScoreBar endgame cue", () => {
  it("pulses the ladder icon while the endgame panel is unseen", () => {
    render(<ScoreBar score={60} maxScore={70} currentRank={TOP_RANK} endgameInfo={endgame} />);
    expect(screen.getByTestId("rank-icon")).toHaveAttribute("data-endgame-cue", "true");
  });

  it("clears the cue the first time the player opens the endgame panel", async () => {
    const user = userEvent.setup();
    render(<ScoreBar score={60} maxScore={70} currentRank={TOP_RANK} endgameInfo={endgame} />);

    await user.click(screen.getByRole("button", { name: /εμφάνιση λέξεων/i }));

    expect(screen.getByTestId("endgame-panel")).toBeInTheDocument();
    expect(screen.getByTestId("rank-icon")).toHaveAttribute("data-endgame-cue", "false");
  });

  it("never cues below the top rank (rank-ladder mode, no endgame info)", () => {
    render(<ScoreBar score={10} maxScore={70} currentRank={RANKS[0].name} />);
    expect(screen.getByTestId("rank-icon")).toHaveAttribute("data-endgame-cue", "false");
  });
});
