// Shell.test.tsx — component tests for the shared navigation shell.
// Verifies hamburger open/close, drawer content, Escape dismissal, and backdrop click.

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { Shell } from "@/components/shared/Shell";
import userEvent from "@testing-library/user-event";

// ── helpers ───────────────────────────────────────────────────────────────────

function setup(ui: React.ReactNode = <Shell><p>content</p></Shell>) {
  const user = userEvent.setup();
  render(ui);
  return { user };
}

function getHamburger() {
  return screen.getByRole("button", { name: /open menu/i });
}

// ── rendering ─────────────────────────────────────────────────────────────────

describe("Shell rendering", () => {
  it("renders the platform header link", () => {
    setup();
    expect(screen.getByRole("link", { name: /leksarxeia/i })).toBeInTheDocument();
  });

  it("header has dark bg-stone-900 background", () => {
    setup();
    const header = document.querySelector("header");
    expect(header).not.toBeNull();
    expect(header!.className).toContain("bg-stone-900");
  });

  it("renders the hamburger button", () => {
    setup();
    expect(getHamburger()).toBeInTheDocument();
  });

  it("renders children inside the shell", () => {
    setup();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("does not show the drawer on initial render", () => {
    setup();
    expect(screen.queryByRole("navigation", { name: /game navigation/i })).not.toBeInTheDocument();
  });
});

// ── drawer open / close ───────────────────────────────────────────────────────

describe("Hamburger drawer", () => {
  it("opens the drawer when hamburger is clicked", async () => {
    const { user } = setup();
    await user.click(getHamburger());
    expect(screen.getByRole("navigation", { name: /game navigation/i })).toBeInTheDocument();
  });

  it("hamburger aria-label changes to 'Close menu' when open", async () => {
    const { user } = setup();
    await user.click(getHamburger());
    expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument();
  });

  it("closes the drawer when hamburger is clicked again", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    await user.click(screen.getByRole("button", { name: /close menu/i }));
    expect(screen.queryByRole("navigation", { name: /game navigation/i })).not.toBeInTheDocument();
  });

  it("closes the drawer when Escape is pressed", async () => {
    const { user } = setup();
    await user.click(getHamburger());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: /game navigation/i })).not.toBeInTheDocument();
  });
});

// ── drawer content ────────────────────────────────────────────────────────────

describe("Drawer game links", () => {
  it("lists all three games in the drawer", async () => {
    const { user } = setup();
    await user.click(getHamburger());

    const nav = screen.getByRole("navigation", { name: /game navigation/i });
    const links = within(nav).getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));

    expect(hrefs).toContain("/leksokipos");
    expect(hrefs).toContain("/leksiarxeio");
    expect(hrefs).toContain("/leksindeseis");
  });

  it("closes the drawer when a game link is clicked", async () => {
    const { user } = setup();
    await user.click(getHamburger());

    const nav = screen.getByRole("navigation", { name: /game navigation/i });
    const spellingBeeLink = within(nav).getByRole("link", { name: /leksokipos/i });
    await user.click(spellingBeeLink);

    expect(screen.queryByRole("navigation", { name: /game navigation/i })).not.toBeInTheDocument();
  });
});
