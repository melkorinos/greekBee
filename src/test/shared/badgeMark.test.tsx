// badgeMark.test.tsx — the drawn badge: a tier-coloured ring, a soft disc, and a
// mark that is always currentColor (TICKET-03).
//
// This component replaced every emoji on the three badge surfaces. The tests that
// matter here are the design decisions, not the pixels: a tier is a COLOUR and
// never a different drawing, and a LOCKED badge keeps its mark visible so a player
// can see what they are chasing.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { BadgeMark } from "@/components/shared/BadgeMark";
import { LEKSOKIPOS_ACHIEVEMENTS } from "@/games/leksokipos/lib/achievements";

/** A real catalog mark — never a synthetic one, so the canvas contract is exercised. */
const PANGRAM = LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === "leksokipos-kynigos-pangram")!.mark;
const POINTS  = LEKSOKIPOS_ACHIEVEMENTS.find((a) => a.id === "leksokipos-syllektis-ponton")!.mark;

/** Every element in the badge's subtree, for "no tier colour anywhere" sweeps. */
function classesWithin(el: HTMLElement): string {
  return [el, ...el.querySelectorAll("*")].map((n) => n.getAttribute("class") ?? "").join(" ");
}

describe("BadgeMark", () => {
  it("draws the given mark on its own viewBox", () => {
    render(<BadgeMark mark={PANGRAM} tier="chryso" size={32} />);
    const path = screen.getByTestId("badge-mark").querySelector("path");
    expect(path).toHaveAttribute("d", PANGRAM.path);
    expect(path?.closest("svg")).toHaveAttribute("viewBox", PANGRAM.viewBox);
  });

  it("paints the ring and the disc in the resolved tier's two colours", () => {
    render(<BadgeMark mark={PANGRAM} tier="chryso" size={32} />);
    const badge = screen.getByTestId("badge-mark");
    expect(badge).toHaveAttribute("data-tier", "chryso");
    expect(badge).toHaveClass("bg-tier-chryso");
    expect(badge.firstElementChild).toHaveClass("bg-tier-chryso-soft");
  });

  it("changes only the frame between tiers — the drawing is identical", () => {
    // The whole reason five drawings cover four tiers. If a future change gives a
    // tier its own art, this fails and the catalog has to grow instead.
    const { unmount } = render(<BadgeMark mark={POINTS} tier="chalkino" size={32} />);
    const bronze = screen.getByTestId("badge-mark").querySelector("path")?.getAttribute("d");
    unmount();

    render(<BadgeMark mark={POINTS} tier="diamanti" size={32} />);
    const diamond = screen.getByTestId("badge-mark");
    expect(diamond.querySelector("path")).toHaveAttribute("d", bronze!);
    expect(diamond).toHaveClass("bg-tier-diamanti");
  });

  it("keeps the mark visible when locked, in a neutral frame with no tier colour", () => {
    // The 🔒 this replaced hid what the player was chasing. A locked badge is the
    // same drawing in borrowed neutral tokens — no greyscale filter, and never a
    // dimmed version of the tier it has not earned yet.
    render(<BadgeMark mark={PANGRAM} tier="chryso" size={32} locked />);
    const badge = screen.getByTestId("badge-mark");

    expect(badge.querySelector("path")).toHaveAttribute("d", PANGRAM.path);
    expect(badge).toHaveAttribute("data-locked", "true");
    expect(classesWithin(badge)).not.toMatch(/bg-tier-/);
    expect(classesWithin(badge)).not.toMatch(/grayscale/);
  });

  it("falls back to the neutral frame when no tier resolved", () => {
    render(<BadgeMark mark={PANGRAM} tier={null} size={32} />);
    expect(classesWithin(screen.getByTestId("badge-mark"))).not.toMatch(/bg-tier-/);
  });

  it("carries its pixel size as a custom property, so any runtime size works", () => {
    // Tailwind cannot emit an arbitrary runtime px value; the ring width derives
    // from this one variable, exactly as the spec page does.
    render(<BadgeMark mark={PANGRAM} tier="chryso" size={14} />);
    expect(screen.getByTestId("badge-mark").style.getPropertyValue("--badge-size")).toBe("14px");
  });

  it("is decorative — the surrounding surface owns the accessible name", () => {
    render(<BadgeMark mark={PANGRAM} tier="chryso" size={32} />);
    expect(screen.getByTestId("badge-mark")).toHaveAttribute("aria-hidden", "true");
  });
});
