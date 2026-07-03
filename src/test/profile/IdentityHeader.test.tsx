// IdentityHeader — the display-only header on /profile.
//
// Reflects the three identity states (Anonymous / ProfileLinked-only / AuthLinked)
// in an avatar initial + status line. It is display-only: the actual sign-in
// button lives in ProfileSection below it.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IdentityHeader } from "@/components/profile/IdentityHeader";

describe("IdentityHeader", () => {
  it("Anonymous: shows 'Παίζεις ανώνυμα' and the fallback 'Α' avatar", () => {
    render(
      <IdentityHeader
        authLinked={false}
        profileLinked={false}
        displayName=""
        authUserName={null}
      />,
    );
    expect(screen.getByText("Παίζεις ανώνυμα")).toBeInTheDocument();
    expect(screen.getByTestId("avatar-disc")).toHaveTextContent("Α");
  });

  it("ProfileLinked-only: shows the active-profile line, name initial, and a Google-upgrade hint", () => {
    render(
      <IdentityHeader
        authLinked={false}
        profileLinked
        displayName="Νίκος"
        authUserName={null}
      />,
    );
    expect(screen.getByText("Προφίλ ενεργό: Νίκος")).toBeInTheDocument();
    expect(screen.getByTestId("avatar-disc")).toHaveTextContent("Ν");
    // Hint that Google makes the identity un-losable (text may vary; assert intent).
    expect(screen.getByText(/Google/)).toBeInTheDocument();
  });

  it("AuthLinked: shows the Google-connected line with the Google name and its initial", () => {
    render(
      <IdentityHeader
        authLinked
        profileLinked
        displayName="Νίκος"
        authUserName="Nikos Papadopoulos"
      />,
    );
    expect(screen.getByText("Συνδεδεμένος με Google ως Nikos Papadopoulos")).toBeInTheDocument();
    expect(screen.getByTestId("avatar-disc")).toHaveTextContent("N");
  });
});
