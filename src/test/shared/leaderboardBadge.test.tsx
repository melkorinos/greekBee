// leaderboardBadge.test.tsx — the display-badge chip that renders beside a
// player's name on every leaderboard (Handoff B).
//
// The chip is its OWN element, never text concatenated into the name string: the
// glyph, plus (for a tiered badge only) the medal of the highest earned tier.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { LeaderboardBadge } from "@/components/shared/LeaderboardBadge";
import { LeaderboardModalBase, buildLeaderboardUrl } from "@/components/shared/LeaderboardModal";
import type { LeaderboardResponse } from "@/hooks/useLeaderboard";

// A controllable useLeaderboard so the placement test can inject a badged row.
const mockLeaderboard = vi.hoisted(() => ({
  data: { top20: [], playerRow: null } as LeaderboardResponse,
}));

vi.mock("@/hooks/useLeaderboard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useLeaderboard")>();
  return {
    ...actual,
    useLeaderboard: () => ({
      data: mockLeaderboard.data,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    }),
  };
});

describe("LeaderboardBadge", () => {
  it("renders a one-shot badge's glyph, with no tier medal", () => {
    render(<LeaderboardBadge badge={{ achievementId: "leksokipos-first-daily", tier: null }} />);
    const chip = screen.getByTestId("lb-badge");
    expect(chip).toHaveTextContent("🌱");
    // No podium medal for a one-shot.
    expect(chip).not.toHaveTextContent("🥉");
    expect(chip).not.toHaveTextContent("🥈");
    expect(chip).not.toHaveTextContent("🥇");
  });

  it("renders a tiered badge's glyph AND the medal of the earned tier", () => {
    render(<LeaderboardBadge badge={{ achievementId: "leksokipos-kynigos-pangram", tier: "asimenio" }} />);
    const chip = screen.getByTestId("lb-badge");
    expect(chip).toHaveTextContent("✍️");
    expect(chip).toHaveTextContent("🥈"); // ασημένιο medal
  });

  it("renders nothing for an unknown achievement id", () => {
    const { container } = render(<LeaderboardBadge badge={{ achievementId: "leksokipos-nope", tier: null }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

// ── Placement inside the leaderboard row ──────────────────────────────────────

describe("LeaderboardModalBase — badge placement", () => {
  it("renders the badge chip as a sibling after the name, not inside the name text", () => {
    mockLeaderboard.data = {
      top20: [{
        rank: 1,
        display_name: "Νίκος",
        score: 42,
        isPlayer: false,
        badge: { achievementId: "leksokipos-kynigos-pangram", tier: "chryso" },
      }],
      playerRow: null,
    };

    render(
      <LeaderboardModalBase
        isOpen
        deviceId="d"
        displayName=""
        today="2026-05-22"
        dates={[]}
        defaultDate="2026-05-22"
        buildUrl={buildLeaderboardUrl("leksokipos")}
        showNameEditor={false}
        onSaveName={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // The name cell holds the plain name text plus a separate badge element.
    const chip = screen.getByTestId("lb-badge");
    const nameCell = chip.closest("td")!;
    expect(nameCell).toContainElement(chip);
    // The name is a bare leading text node, NOT concatenated with the glyph —
    // the chip is a distinct element sibling that follows it.
    expect(nameCell.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(nameCell.firstChild?.textContent).toContain("Νίκος");
    expect(chip.tagName).toBe("SPAN");
    expect(chip).toHaveTextContent("🥇"); // χρυσό medal
  });
});
