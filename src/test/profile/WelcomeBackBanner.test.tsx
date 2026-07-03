// WelcomeBackBanner — the one-shot Sign-in Restore greeting on /profile.
//
// On mount it consumes sessionStorage["signin-restore-welcome"]: if present it
// renders a welcome-back message once and clears the flag so a refresh won't
// show it again. Absent flag → renders nothing.

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WelcomeBackBanner } from "@/components/profile/WelcomeBackBanner";

afterEach(() => sessionStorage.clear());

describe("WelcomeBackBanner", () => {
  it("renders a named greeting and clears the flag when set", () => {
    sessionStorage.setItem("signin-restore-welcome", "Νίκος");
    render(<WelcomeBackBanner />);
    expect(screen.getByText(/Καλώς όρισες πίσω/)).toHaveTextContent("Νίκος");
    expect(sessionStorage.getItem("signin-restore-welcome")).toBeNull();
  });

  it("renders nothing when the flag is absent", () => {
    const { container } = render(<WelcomeBackBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a generic greeting when the flag value is empty (nameless restore)", () => {
    sessionStorage.setItem("signin-restore-welcome", "");
    render(<WelcomeBackBanner />);
    expect(screen.getByText(/Καλώς όρισες πίσω/)).toBeInTheDocument();
    expect(sessionStorage.getItem("signin-restore-welcome")).toBeNull();
  });
});
