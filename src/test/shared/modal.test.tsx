// modal.test.tsx — the shared Modal primitive (ADR 0009).
//
// Locks the contract every dialog now relies on: open/close gating, the two
// shell variants, overlay-click-to-close (with stopPropagation on the card),
// the built-in close button, and test-hook pass-through.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { Modal } from "@/components/shared/Modal";

describe("Modal — open/close gating", () => {
  it("renders nothing when closed", () => {
    render(<Modal isOpen={false} onClose={() => {}}>hi</Modal>);
    expect(screen.queryByText("hi")).toBeNull();
  });

  it("renders children when open", () => {
    render(<Modal isOpen onClose={() => {}}>hi</Modal>);
    expect(screen.getByText("hi")).not.toBeNull();
  });
});

describe("Modal — center variant (default)", () => {
  it("backdrop centres and pads so the card never touches the edge", () => {
    render(<Modal isOpen onClose={() => {}} backdropTestId="bd">x</Modal>);
    const backdrop = screen.getByTestId("bd");
    expect(backdrop.className).toContain("items-center");
    expect(backdrop.className).toContain("justify-center");
    expect(backdrop.className).toContain("px-4");
  });

  it("card is a rounded, width-capped dialog", () => {
    render(<Modal isOpen onClose={() => {}} cardTestId="card">x</Modal>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("rounded-2xl");
    expect(card.className).toContain("w-full");
    expect(card.className).toContain("max-w-sm");
    expect(card.className).toContain("p-6");
  });

  it("renders the built-in close button by default", () => {
    render(<Modal isOpen onClose={() => {}} closeTestId="x">x</Modal>);
    expect(screen.getByTestId("x")).not.toBeNull();
  });

  it("hides the close button when showClose is false", () => {
    render(<Modal isOpen onClose={() => {}} showClose={false} closeTestId="x">x</Modal>);
    expect(screen.queryByTestId("x")).toBeNull();
  });

  it("merges cardClassName onto the card", () => {
    render(<Modal isOpen onClose={() => {}} cardTestId="card" cardClassName="overflow-hidden">x</Modal>);
    expect(screen.getByTestId("card").className).toContain("overflow-hidden");
  });
});

describe("Modal — sheet variant", () => {
  it("anchors to the bottom with a rounded top and no built-in close button", () => {
    render(
      <Modal isOpen onClose={() => {}} variant="sheet" backdropTestId="bd" cardTestId="card" closeTestId="x">
        x
      </Modal>,
    );
    expect(screen.getByTestId("bd").className).toContain("items-end");
    expect(screen.getByTestId("card").className).toContain("rounded-t-2xl");
    expect(screen.queryByTestId("x")).toBeNull();
  });
});

describe("Modal — dismissal", () => {
  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} backdropTestId="bd">x</Modal>);
    fireEvent.click(screen.getByTestId("bd"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does NOT close when the card body is clicked", () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} cardTestId="card">x</Modal>);
    fireEvent.click(screen.getByTestId("card"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} closeTestId="x">x</Modal>);
    fireEvent.click(screen.getByTestId("x"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("Modal — accessibility", () => {
  it("applies the dialog and close-button aria labels", () => {
    render(<Modal isOpen onClose={() => {}} ariaLabel="My dialog" closeLabel="Κλείσιμο">x</Modal>);
    expect(screen.getByRole("dialog", { name: "My dialog" })).not.toBeNull();
    expect(screen.getByLabelText("Κλείσιμο")).not.toBeNull();
  });
});
