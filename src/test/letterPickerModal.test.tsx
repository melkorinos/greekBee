// letterPickerModal.test.tsx — unit + interaction tests for the shared
// LetterPickerModal component.
//
// The modal is the entry point for all custom-puzzle creation, so bugs here
// break the most user-visible feature.  Tests cover:
//   - Rendering (closed vs open)
//   - First-tap → center (yellow, locked)
//   - Subsequent taps → outer (dark)
//   - Deselect outer by re-tapping
//   - 7-letter cap: 8th unselected tile is disabled
//   - Reset clears everything
//   - Random fills all 7 slots
//   - Generate fires onConfirm with correct args and resets state
//   - Generate is disabled until 7 letters chosen
//   - Close button calls onClose and resets state

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LetterPickerModal } from "@/components/shared/LetterPickerModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup(props: Partial<Parameters<typeof LetterPickerModal>[0]> = {}) {
  const onClose   = vi.fn();
  const onConfirm = vi.fn();
  const user      = userEvent.setup();

  render(
    <LetterPickerModal
      isOpen={props.isOpen ?? true}
      onClose={props.onClose ?? onClose}
      onConfirm={props.onConfirm ?? onConfirm}
    />,
  );

  const tile  = (l: string) => screen.getByTestId(`letter-tile-${l}`);
  const count = () => screen.getByTestId("letter-picker-count");

  return { user, onClose, onConfirm, tile, count };
}

// ── Visibility ────────────────────────────────────────────────────────────────

describe("LetterPickerModal — visibility", () => {
  it("renders nothing when isOpen is false", () => {
    render(
      <LetterPickerModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.queryByTestId("letter-picker-modal")).toBeNull();
  });

  it("renders the modal when isOpen is true", () => {
    setup();
    expect(screen.getByTestId("letter-picker-modal")).toBeInTheDocument();
  });

  it("shows the 0/7 count initially", () => {
    const { count } = setup();
    expect(count()).toHaveTextContent("0 / 7");
  });

  it("renders all 24 Greek letter tiles", () => {
    setup();
    // Spot-check a selection from each row
    ["ε", "α", "ζ", "θ", "ξ", "ψ"].forEach((l) => {
      expect(screen.getByTestId(`letter-tile-${l}`)).toBeInTheDocument();
    });
    expect(screen.getAllByTestId(/^letter-tile-/).length).toBe(24);
  });
});

// ── Center letter selection ───────────────────────────────────────────────────

describe("LetterPickerModal — center letter", () => {
  it("first tapped letter becomes the center", async () => {
    const { user, tile, count } = setup();
    await user.click(tile("α"));
    expect(tile("α")).toHaveAttribute("aria-pressed", "true");
    expect(count()).toHaveTextContent("1 / 7");
  });

  it("center tile has aria-label containing 'κεντρικό'", async () => {
    const { user, tile } = setup();
    await user.click(tile("κ"));
    expect(tile("κ")).toHaveAttribute("aria-label", expect.stringContaining("κεντρικό"));
  });

  it("center tile is not deselected when tapped again", async () => {
    const { user, tile } = setup();
    await user.click(tile("α"));
    await user.click(tile("α")); // second tap — should do nothing
    expect(tile("α")).toHaveAttribute("aria-pressed", "true");
  });
});

// ── Outer letter selection ────────────────────────────────────────────────────

describe("LetterPickerModal — outer letters", () => {
  it("second to seventh taps fill outer letters", async () => {
    const { user, tile, count } = setup();
    for (const l of ["α", "ε", "ι", "ο", "σ", "τ", "κ"]) {
      await user.click(tile(l));
    }
    expect(count()).toHaveTextContent("7 / 7");
  });

  it("tapping a selected outer letter deselects it", async () => {
    const { user, tile, count } = setup();
    await user.click(tile("α")); // center
    await user.click(tile("ε")); // outer
    expect(tile("ε")).toHaveAttribute("aria-pressed", "true");
    await user.click(tile("ε")); // deselect
    expect(tile("ε")).toHaveAttribute("aria-pressed", "false");
    expect(count()).toHaveTextContent("1 / 7");
  });

  it("an 8th unselected letter tile is disabled when 7 are already chosen", async () => {
    const { user, tile } = setup();
    for (const l of ["α", "ε", "ι", "ο", "σ", "τ", "κ"]) {
      await user.click(tile(l));
    }
    // β is not selected — should be disabled now
    expect(tile("β")).toBeDisabled();
  });
});

// ── Reset ─────────────────────────────────────────────────────────────────────

describe("LetterPickerModal — Reset", () => {
  it("Reset clears center and outer", async () => {
    const { user, tile, count } = setup();
    await user.click(tile("α"));
    await user.click(tile("ε"));
    await user.click(screen.getByTestId("letter-picker-reset"));
    expect(count()).toHaveTextContent("0 / 7");
    expect(tile("α")).toHaveAttribute("aria-pressed", "false");
    expect(tile("ε")).toHaveAttribute("aria-pressed", "false");
  });
});

// ── Random ────────────────────────────────────────────────────────────────────

describe("LetterPickerModal — Random", () => {
  it("Random fills all 7 slots", async () => {
    const { user, count } = setup();
    await user.click(screen.getByTestId("letter-picker-random"));
    expect(count()).toHaveTextContent("7 / 7");
  });

  it("exactly one tile has aria-label containing 'κεντρικό' after Random", async () => {
    const { user } = setup();
    await user.click(screen.getByTestId("letter-picker-random"));
    const centers = screen
      .getAllByTestId(/^letter-tile-/)
      .filter((el) => el.getAttribute("aria-label")?.includes("κεντρικό"));
    expect(centers).toHaveLength(1);
  });

  it("exactly 6 tiles are outer-selected after Random", async () => {
    const { user } = setup();
    await user.click(screen.getByTestId("letter-picker-random"));
    const selected = screen
      .getAllByTestId(/^letter-tile-/)
      .filter(
        (el) =>
          el.getAttribute("aria-pressed") === "true" &&
          !el.getAttribute("aria-label")?.includes("κεντρικό"),
      );
    expect(selected).toHaveLength(6);
  });
});

// ── Generate ──────────────────────────────────────────────────────────────────

describe("LetterPickerModal — Generate", () => {
  it("Generate button is disabled when fewer than 7 letters are chosen", () => {
    setup();
    expect(screen.getByTestId("letter-picker-generate")).toBeDisabled();
  });

  it("Generate button is enabled when all 7 slots are filled", async () => {
    const { user } = setup();
    await user.click(screen.getByTestId("letter-picker-random"));
    expect(screen.getByTestId("letter-picker-generate")).not.toBeDisabled();
  });

  it("Generate calls onConfirm with the correct center and outer letters", async () => {
    const { user, onConfirm, tile } = setup();
    const letters = ["κ", "α", "ε", "ι", "ο", "σ", "τ"];
    for (const l of letters) await user.click(tile(l));
    await user.click(screen.getByTestId("letter-picker-generate"));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith("κ", ["α", "ε", "ι", "ο", "σ", "τ"]);
  });

  it("Generate resets the modal state after confirming", async () => {
    const { user, tile, count } = setup();
    const letters = ["κ", "α", "ε", "ι", "ο", "σ", "τ"];
    for (const l of letters) await user.click(tile(l));
    await user.click(screen.getByTestId("letter-picker-generate"));
    expect(count()).toHaveTextContent("0 / 7");
  });
});

// ── Close ─────────────────────────────────────────────────────────────────────

describe("LetterPickerModal — Close", () => {
  it("Close button calls onClose", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByTestId("letter-picker-close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clicking the backdrop calls onClose", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByTestId("letter-picker-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
