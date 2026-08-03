// Shell.test.tsx — component tests for the shared navigation shell.
// Verifies hamburger open/close, drawer content, Escape dismissal, backdrop click,
// and the dark/light theme toggle button.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

// The header profile button reads the current path and drives the router (toggle
// behaviour). Mock next/navigation so the button has a router + pathname under test.
let _pathname = "/leksokipos";
const push = vi.fn();
const back = vi.fn();
const prefetch = vi.fn().mockResolvedValue(undefined);
vi.mock("next/navigation", () => ({
  usePathname: () => _pathname,
  useRouter:   () => ({ push, back, prefetch }),
}));

const { Shell }               = await import("@/components/shared/Shell");
const { OfflineModeProvider } = await import("@/hooks/useOfflineMode");

// ── cleanup ───────────────────────────────────────────────────────────────────
// Theme toggle modifies document.documentElement and localStorage; reset between tests.
beforeEach(() => {
  _pathname = "/leksokipos";
  push.mockClear();
  back.mockClear();
});

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

  it("renders an always-visible profile button that opens /profile from another page", async () => {
    const { user } = setup();
    const profileBtn = screen.getByRole("button", { name: "Το προφίλ μου" });
    await user.click(profileBtn);
    expect(push).toHaveBeenCalledWith("/profile");
    expect(back).not.toHaveBeenCalled();
  });

  it("goes back from /profile when there is in-app history", async () => {
    _pathname = "/profile";
    window.history.replaceState({ ...window.history.state, idx: 2 }, "");
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Το προφίλ μου" }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("falls back to home from /profile with no in-app history", async () => {
    _pathname = "/profile";
    window.history.replaceState({ ...window.history.state, idx: 0 }, "");
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Το προφίλ μου" }));
    expect(push).toHaveBeenCalledWith("/");
    expect(back).not.toHaveBeenCalled();
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
    expect(hrefs).toContain("/leksodromia");
    expect(hrefs).toContain("/leksoplegma");
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

// ── Offline Mode toggle ───────────────────────────────────────────────────────
// The toggle lives in the drawer beside the theme toggle: Offline Mode is a
// platform-wide, deliberate, infrequent action, so it does not belong in any
// game's chrome. The drawer is also where the explanation must live — the
// browser's beforeunload dialog copy cannot be customised (ADR 0010).

function setupOffline() {
  const user = userEvent.setup();
  render(
    <OfflineModeProvider>
      <Shell><p>content</p></Shell>
    </OfflineModeProvider>,
  );
  return { user };
}

async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /open menu/i }));
  return screen.getByRole("navigation", { name: /game navigation/i });
}

describe("Offline Mode toggle", () => {
  it("renders an inactive toggle in the drawer", async () => {
    const { user } = setupOffline();
    const nav = await openDrawer(user);
    expect(within(nav).getByRole("button", { name: /εκτός σύνδεσης/i })).toBeInTheDocument();
  });

  it("explains what Offline Mode does before the player enables it", async () => {
    const { user } = setupOffline();
    const nav = await openDrawer(user);
    // The player must learn that refreshing without a connection ends the round
    // here, because the browser dialog cannot tell them.
    expect(within(nav).getByText(/ανανεώσεις/i)).toBeInTheDocument();
  });

  it("prefetches the offline games when activated", async () => {
    const { user } = setupOffline();
    const nav = await openDrawer(user);

    await user.click(within(nav).getByRole("button", { name: /εκτός σύνδεσης/i }));

    const prefetched = prefetch.mock.calls.map(([href]) => href);
    expect(prefetched).toContain("/leksokipos");
    expect(prefetched).toContain("/leksiarxeio");
  });

  it("reports the active state after activation", async () => {
    const { user } = setupOffline();
    const nav = await openDrawer(user);

    await user.click(within(nav).getByRole("button", { name: /εκτός σύνδεσης/i }));

    expect(within(nav).getByRole("button", { name: /εκτός σύνδεσης/i }))
      .toHaveAttribute("aria-pressed", "true");
  });

  it("deactivates on a second click", async () => {
    const { user } = setupOffline();
    const nav = await openDrawer(user);
    const toggle = () => within(nav).getByRole("button", { name: /εκτός σύνδεσης/i });

    await user.click(toggle());
    await user.click(toggle());

    expect(toggle()).toHaveAttribute("aria-pressed", "false");
  });
});

// ── Navigation interception ───────────────────────────────────────────────────

describe("Offline Mode navigation guard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not intercept navigation between prefetched games — that is the point of the feature", async () => {
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);

    const { user } = setupOffline();
    const nav = await openDrawer(user);
    await user.click(within(nav).getByRole("button", { name: /εκτός σύνδεσης/i }));

    const drawer = screen.getByRole("navigation", { name: /game navigation/i });
    await user.click(within(drawer).getByRole("link", { name: /leksiarxeio/i }));

    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("confirms before leaving for a route that was not prefetched", async () => {
    const confirmSpy = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmSpy);

    const { user } = setupOffline();
    const nav = await openDrawer(user);
    await user.click(within(nav).getByRole("button", { name: /εκτός σύνδεσης/i }));

    const drawer = screen.getByRole("navigation", { name: /game navigation/i });
    await user.click(within(drawer).getByRole("link", { name: /leksikastirio/i }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it("does not confirm on any link while Offline Mode is off", async () => {
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);

    const { user } = setupOffline();
    const nav = await openDrawer(user);
    await user.click(within(nav).getByRole("link", { name: /leksikastirio/i }));

    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
