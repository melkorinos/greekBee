// profileSectionSignIn.test.tsx — ADR 0012 visibility rule.
//
// Google sign-in must be offered wherever ProfileSection renders and the device
// is not AuthLinked — as a rule, not a per-call-site choice. In particular the
// `linked` mode (ProfileLinked, no Google) must let the player upgrade to an
// un-losable Google identity; today it only appears in `idle` mode.

import { fireEvent, render, screen } from "@testing-library/react";
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

describe("ProfileSection — Google sign-in is offered whenever not AuthLinked", () => {
  it("offers Google sign-in in linked mode (ProfileLinked, no Google)", () => {
    render(<ProfileSection {...baseProps()} profileLinked authLinked={false} />);
    expect(screen.getByText("Σύνδεση με Google")).toBeTruthy();
  });

  it("clicking sign-in in linked mode calls onSignIn", () => {
    const props = baseProps();
    render(<ProfileSection {...props} profileLinked authLinked={false} />);
    fireEvent.click(screen.getByText("Σύνδεση με Google"));
    expect(props.onSignIn).toHaveBeenCalledTimes(1);
  });

  it("offers Google sign-in in idle mode (unlinked)", () => {
    render(<ProfileSection {...baseProps()} profileLinked={false} authLinked={false} />);
    expect(screen.getByText("Σύνδεση με Google")).toBeTruthy();
  });

  it("hides Google sign-in and shows sign-out once AuthLinked", () => {
    render(<ProfileSection {...baseProps()} profileLinked authLinked authUserName="Νίκος" />);
    expect(screen.queryByText("Σύνδεση με Google")).toBeNull();
    expect(screen.getByText("Αποσύνδεση Google")).toBeTruthy();
  });
});
