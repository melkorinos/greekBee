// leaderboardBadge.test.tsx — the display-badge chip that renders beside a
// player's name on every leaderboard (Handoff B).
//
// The chip is its OWN element, never text concatenated into the name string: one
// drawn BadgeMark framed in the resolved tier's colour. It renders NO text at all,
// which is the point — an emoji badge beside a display name that itself contains an
// emoji was indistinguishable, and display_name has no validation.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { LeaderboardBadge } from "@/components/shared/LeaderboardBadge";
import { LeaderboardModalBase, buildLeaderboardUrl } from "@/components/shared/LeaderboardModal";
import { LEKSOKIPOS_ACHIEVEMENTS } from "@/games/leksokipos/lib/achievements";
import type { LeaderboardResponse } from "@/hooks/useLeaderboard";

/** The catalog's own art for Κυνηγός Πανγκράμ — the chip must draw exactly this. */
function pangramMarkPath(): string {
  return LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === "leksokipos-kynigos-pangram")!.mark.path;
}

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
  it("draws the badge's own mark, framed in the earned tier", () => {
    render(<LeaderboardBadge badge={{ achievementId: "leksokipos-kynigos-pangram", tier: "asimenio" }} />);
    const chip = screen.getByTestId("lb-badge");
    const badgeMark = screen.getByTestId("badge-mark");

    expect(chip).toContainElement(badgeMark);
    expect(badgeMark).toHaveAttribute("data-tier", "asimenio");
    expect(badgeMark.querySelector("path")).toHaveAttribute("d", pangramMarkPath());
  });

  it("renders no text whatsoever — a drawn mark can never be read as a name character", () => {
    // The whole reason this work exists: an emoji badge sat beside an emoji in a
    // player's display_name and the two were indistinguishable.
    render(<LeaderboardBadge badge={{ achievementId: "leksokipos-kynigos-pangram", tier: "chryso" }} />);
    expect(screen.getByTestId("lb-badge").textContent).toBe("");
  });

  it("still names the badge for assistive tech, tier included", () => {
    // The mark is decorative; the chip carries the only accessible name there is.
    render(<LeaderboardBadge badge={{ achievementId: "leksokipos-kynigos-pangram", tier: "asimenio" }} />);
    expect(screen.getByTestId("lb-badge")).toHaveAttribute(
      "aria-label",
      "Κυνηγός Πανγκράμ — Ασημένιο",
    );
  });

  it("draws a neutral frame when no tier was resolved", () => {
    // Every catalog badge is tiered after TICKET-02, so a null tier now only
    // reaches the chip defensively — it must render the badge, not nothing.
    render(<LeaderboardBadge badge={{ achievementId: "leksokipos-stin-korifi", tier: null }} />);
    expect(screen.getByTestId("badge-mark")).not.toHaveAttribute("data-tier");
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
    // The name is a bare leading text node, NOT concatenated with the badge —
    // the chip is a distinct element sibling that follows it.
    expect(nameCell.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(nameCell.firstChild?.textContent).toContain("Νίκος");
    expect(chip.tagName).toBe("SPAN");
    // The cell's whole text is the name and nothing else — the badge adds no glyph.
    expect(nameCell.textContent).toBe("Νίκος");
    expect(screen.getByTestId("badge-mark")).toHaveAttribute("data-tier", "chryso");
  });
});
