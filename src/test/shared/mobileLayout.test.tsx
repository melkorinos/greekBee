// mobileLayout.test.tsx — regression tests for mobile layout fixes.
//
// Locks the HowToPlayModal-specific overflow contracts that prevented content
// protruding on iOS Safari and long rule lists pushing the close button off
// short screens. The modal *shell* contracts (backdrop centring, px-4 padding,
// rounded width-capped card) belong to the shared Modal primitive and are
// covered by modal.test.tsx — do not re-assert them here.

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { HowToPlayModal } from "@/components/shared/HowToPlayModal";

const ITEMS = ["Rule one", "Rule **two** bold", "Rule three"];

function renderOpenModal() {
  render(
    <HowToPlayModal
      title="Test modal"
      items={ITEMS}
      bulletIcon="▸"
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
  it("modal card gets overflow-hidden to clip any overflowing children", () => {
    renderOpenModal();
    const backdrop = document.querySelector(".fixed.inset-0") as HTMLElement;
    expect(backdrop).not.toBeNull();
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
});
