// Shell.test.tsx — component tests for the shared navigation shell.
// Verifies hamburger open/close, drawer content, Escape dismissal, backdrop click,
// and the dark/light theme toggle button.

import { afterEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { Shell } from "@/components/shared/Shell";
import userEvent from "@testing-library/user-event";

// ── cleanup ───────────────────────────────────────────────────────────────────
// Theme toggle modifies document.documentElement and localStorage; reset between tests.
afterEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});

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

  it("header has the surface background token", () => {
    setup();
    const header = document.querySelector("header");
    expect(header).not.toBeNull();
    expect(header!.className).toContain("bg-surface");
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
  it("lists all games in the drawer", async () => {
    const { user } = setup();
    await user.click(getHamburger());

    const nav = screen.getByRole("navigation", { name: /game navigation/i });
    const links = within(nav).getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));

    expect(hrefs).toContain("/leksokipos");
    expect(hrefs).toContain("/leksiarxeio");
    expect(hrefs).toContain("/leksindeseis");
    expect(hrefs).toContain("/stavrolekso");
  });

  it("closes the drawer when a game link is clicked", async () => {
    const { user } = setup();
    await user.click(getHamburger());

    const nav = screen.getByRole("navigation", { name: /game navigation/i });
    const leksokiposLink = within(nav).getByRole("link", { name: /leksokipos/i });
    await user.click(leksokiposLink);

    expect(screen.queryByRole("navigation", { name: /game navigation/i })).not.toBeInTheDocument();
  });

  it("lists leksikastirio in the community section", async () => {
    const { user } = setup();
    await user.click(getHamburger());
    const nav   = screen.getByRole("navigation", { name: /game navigation/i });
    const hrefs = within(nav).getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/leksikastirio");
  });

  it("community section is separated from games section by a divider", async () => {
    const { user } = setup();
    await user.click(getHamburger());
    const nav = screen.getByRole("navigation", { name: /game navigation/i });
    expect(nav.querySelector("hr")).toBeInTheDocument();
  });
});

// ── theme toggle ──────────────────────────────────────────────────────────────

describe("Theme toggle", () => {
  it("renders the theme toggle button in light mode by default", () => {
    setup();
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeInTheDocument();
  });

  it("clicking the toggle switches to dark mode", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /switch to dark mode/i }));
    expect(screen.getByRole("button", { name: /switch to light mode/i })).toBeInTheDocument();
  });

  it("clicking the toggle adds .dark class to documentElement", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /switch to dark mode/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("clicking the toggle twice returns to light mode and removes .dark class", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /switch to dark mode/i }));
    await user.click(screen.getByRole("button", { name: /switch to light mode/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeInTheDocument();
  });

  it("persists the theme preference to localStorage", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /switch to dark mode/i }));
    expect(localStorage.getItem("theme-preference")).toBe("dark");
  });
});
