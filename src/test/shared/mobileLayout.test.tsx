// mobileLayout.test.tsx — regression tests for mobile layout fixes.
//
// These tests lock down the CSS-class contracts that prevent three mobile bugs:
//   1. Horizontal scroll / black left-edge strip (overflow-x not clamped)
//   2. Fixed modals shifted right on Pixel 6 (layout-viewport wider than visual)
//   3. Modal content overflowing on iOS Safari (no overflow clipping on modal box)
//
// None of these require E2E — they assert className strings on rendered elements.

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { HowToPlayModal } from "@/components/shared/HowToPlayModal";

const ITEMS = ["Rule one", "Rule **two** bold", "Rule three"];

function renderOpenModal(lightTrigger = false) {
  render(
    <HowToPlayModal
      title="Test modal"
      items={ITEMS}
      bulletIcon="▸"
      lightTrigger={lightTrigger}
    />,
  );
  // Open the modal
  fireEvent.click(screen.getByRole("button", { name: /how to play/i }));
}

// ── HowToPlayModal — overflow safety ─────────────────────────────────────────
// Regression: the modal box had no overflow clipping, so on iOS Safari content
// inside (e.g. a wide honeycomb example) could protrude beyond the rounded box.
// The rule list also had no max-height, so a very long list could push the
// close button off screen on short phones.

describe("HowToPlayModal — overflow safety classes", () => {
  it("modal box has overflow-hidden to clip any overflowing children", () => {
    renderOpenModal();
    // The modal content box is the div that stops click propagation.
    // It sits directly inside the backdrop div.
    const backdrop = document.querySelector(".fixed.inset-0") as HTMLElement;
    expect(backdrop).not.toBeNull();
    // The modal box is the first child of the backdrop
    const modalBox = backdrop.firstElementChild as HTMLElement;
    expect(modalBox.className).toContain("overflow-hidden");
  });

  it("rule list has overflow-y-auto for independent scrolling on short screens", () => {
    renderOpenModal();
    const list = document.querySelector("ul") as HTMLElement;
    expect(list.className).toContain("overflow-y-auto");
  });

  it("rule list has a max-height so it never pushes the close button off screen", () => {
    renderOpenModal();
    const list = document.querySelector("ul") as HTMLElement;
    // max-h-[70dvh] uses dynamic viewport height — safe on notched phones
    expect(list.className).toContain("max-h-[70dvh]");
  });

  it("modal box has rounded-2xl (border-radius must not be lost when overflow-hidden added)", () => {
    renderOpenModal();
    const backdrop = document.querySelector(".fixed.inset-0") as HTMLElement;
    const modalBox = backdrop.firstElementChild as HTMLElement;
    expect(modalBox.className).toContain("rounded-2xl");
  });

  it("backdrop uses fixed inset-0 flex items-center justify-center for centring", () => {
    renderOpenModal();
    const backdrop = document.querySelector(".fixed.inset-0") as HTMLElement;
    expect(backdrop.className).toContain("flex");
    expect(backdrop.className).toContain("items-center");
    expect(backdrop.className).toContain("justify-center");
  });

  it("modal box has w-full max-w-sm so it never exceeds the safe content width", () => {
    renderOpenModal();
    const backdrop = document.querySelector(".fixed.inset-0") as HTMLElement;
    const modalBox = backdrop.firstElementChild as HTMLElement;
    expect(modalBox.className).toContain("w-full");
    expect(modalBox.className).toContain("max-w-sm");
  });

  it("backdrop has px-4 padding so the modal never touches screen edges", () => {
    renderOpenModal();
    const backdrop = document.querySelector(".fixed.inset-0") as HTMLElement;
    expect(backdrop.className).toContain("px-4");
  });
});
