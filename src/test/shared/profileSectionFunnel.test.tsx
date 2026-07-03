// profileSectionFunnel.test.tsx — the "Δες το προφίλ σου →" funnel link.
//
// ProfileSection renders inside the leaderboard modals; a link funnels players
// from the modal to the full /profile page. It is on by default (all modals get
// it) and opt-out for the profile page itself, which must not link to itself.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfileSection } from "@/components/shared/ProfileSection";

function baseProps() {
  return {
    displayName:        "Νίκος",
    onTransferGenerate: vi.fn().mockResolvedValue("ABCDEF"),
    onTransferClaim:    vi.fn().mockResolvedValue(undefined),
    onDisconnect:       vi.fn(),
    onSignIn:           vi.fn().mockResolvedValue(undefined),
    onSignOut:          vi.fn().mockResolvedValue(undefined),
    onSaveName:         vi.fn(),
  };
}

describe("ProfileSection — /profile funnel link", () => {
  it("links to /profile by default", () => {
    render(<ProfileSection {...baseProps()} profileLinked={false} />);
    const link = screen.getByRole("link", { name: /Δες το προφίλ σου/ });
    expect(link).toHaveAttribute("href", "/profile");
  });

  it("hides the funnel link when showProfileLink is false", () => {
    render(<ProfileSection {...baseProps()} profileLinked={false} showProfileLink={false} />);
    expect(screen.queryByRole("link", { name: /Δες το προφίλ σου/ })).toBeNull();
  });
});
