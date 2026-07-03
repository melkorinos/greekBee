// ProfileChip — the home-page client island funnelling to /profile.
//
// Reads the persisted identity on mount: shows the display name when the device
// has an active profile, otherwise "Σύνδεση". Always links to /profile.

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileChip } from "@/components/shared/ProfileChip";
import { setDisplayName, setProfileLinked } from "@/hooks/useGameStore";

describe("ProfileChip", () => {
  it("shows 'Σύνδεση' and links to /profile when unlinked", () => {
    render(<ProfileChip />);
    const link = screen.getByRole("link", { name: /Το προφίλ μου/ });
    expect(link).toHaveAttribute("href", "/profile");
    expect(link).toHaveTextContent("Σύνδεση");
  });

  it("shows the display name when the device has an active profile", async () => {
    setProfileLinked(true);
    setDisplayName("Νίκος");
    render(<ProfileChip />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Το προφίλ μου/ })).toHaveTextContent("Νίκος"),
    );
  });
});
