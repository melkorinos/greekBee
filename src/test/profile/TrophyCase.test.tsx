// TrophyCase — the locked trophy grid on /profile.
//
// v1 renders every catalog entry greyed/locked (no earned state yet). Tiered
// badges also show their tier thresholds. Detection lands with the achievements
// epic; here we only verify the display surface over the frozen catalog.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrophyCase } from "@/components/profile/TrophyCase";
import { LEKSOKIPOS_ACHIEVEMENTS } from "@/games/leksokipos/lib/achievements";

describe("TrophyCase", () => {
  it("renders one locked tile per catalog entry, with name and hint", () => {
    render(<TrophyCase />);
    expect(screen.getAllByTestId("trophy-tile")).toHaveLength(LEKSOKIPOS_ACHIEVEMENTS.length);
    expect(screen.getByText("Πρώτα Βήματα")).toBeInTheDocument();
    expect(screen.getByText("Παίξε το πρώτο σου ημερήσιο παζλ.")).toBeInTheDocument();
  });

  it("shows tier rows with Greek tier words and formatted thresholds for tiered badges", () => {
    render(<TrophyCase />);
    // Συλλέκτης Πόντων tiers: 1.000 / 10.000 / 25.000 (el-GR grouping)
    expect(screen.getByText(/Χάλκινο · 1\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Ασημένιο · 10\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Χρυσό · 25\.000/)).toBeInTheDocument();
  });
});
