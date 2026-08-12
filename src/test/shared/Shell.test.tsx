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

// The toggle's accessible name. Kept as a constant because the visible label is a
// plain switch now — no emoji, no state words baked into the text — so tests must
// match on the stable name rather than on whatever the label currently reads.
const OFFLINE_TOGGLE_NAME = /λειτουργία εκτός σύνδεσης/i;

// ── cleanup ───────────────────────────────────────────────────────────────────
// Theme toggle modifies document.documentElement and localStorage; reset between tests.
beforeEach(() => {
  _pathname = "/leksokipos";
  push.mockClear();
  back.mockClear();
  prefetch.mockClear();
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
  it("lists the launched games in the drawer", async () => {
    const { user } = setup();
    await user.click(getHamburger());

    const nav = screen.getByRole("navigation", { name: /game navigation/i });
    const links = within(nav).getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));

    expect(hrefs).toContain("/leksokipos");
    expect(hrefs).toContain("/leksiarxeio");
    expect(hrefs).toContain("/leksodromia");
    expect(hrefs).toContain("/leksoplegma");
    expect(hrefs).toContain("/stavrolekso");

    // Hidden since TICKET-06 (ADR 0022) — finished, deliberately not launching. The
    // route stays live; the drawer just stops advertising it. The derivation itself
    // is probe-tested in registryCoverage.test.tsx; this pins today's roster.
    expect(hrefs).not.toContain("/leksindeseis");
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

// ── privacy link ──────────────────────────────────────────────────────────────
// TICKET-07. The drawer is the privacy page's ONLY entry point — there is no
// footer, no header slot and no home-page link — so if this link goes, the page
// becomes unreachable in practice while still returning 200. Nothing else in the
// suite would catch that, which is why the reachability is asserted here rather
// than left to the route test.

describe("Drawer privacy link", () => {
  it("links to /privacy from the drawer", async () => {
    const { user } = setup();
    await user.click(getHamburger());
    const nav = screen.getByRole("navigation", { name: /game navigation/i });
    expect(within(nav).getByRole("link", { name: /απόρρητο/i })).toHaveAttribute("href", "/privacy");
  });

  it("keeps it out of the header, which is already four buttons wide", () => {
    setup();
    const header = document.querySelector("header");
    expect(header).not.toBeNull();
    expect(within(header as HTMLElement).queryByRole("link", { name: /απόρρητο/i })).not.toBeInTheDocument();
  });

  it("closes the drawer when the privacy link is clicked", async () => {
    const { user } = setup();
    await user.click(getHamburger());
    const nav = screen.getByRole("navigation", { name: /game navigation/i });
    await user.click(within(nav).getByRole("link", { name: /απόρρητο/i }));
    expect(screen.queryByRole("navigation", { name: /game navigation/i })).not.toBeInTheDocument();
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

// ── sound toggle ──────────────────────────────────────────────────────────────
// ADR 0021. A Platform preference like theme, so it renders on every page even
// though only Leksokipos has Cues — hiding it per-route would force the Shell to
// know which Games make noise. Off by default: unexpected audio is the most
// complained-about behaviour on the web, and mobile blocks the first play anyway.

describe("Sound toggle", () => {
  it("renders muted by default (sound is opt-in)", () => {
    setup();
    expect(screen.getByRole("button", { name: /turn sound on/i })).toBeInTheDocument();
  });

  it("clicking the toggle turns sound on", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /turn sound on/i }));
    expect(screen.getByRole("button", { name: /turn sound off/i })).toBeInTheDocument();
  });

  it("persists the sound preference to localStorage", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /turn sound on/i }));
    expect(localStorage.getItem("sound-preference")).toBe("on");
  });

  it("clicking the toggle twice returns to muted and persists it", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /turn sound on/i }));
    await user.click(screen.getByRole("button", { name: /turn sound off/i }));
    expect(screen.getByRole("button", { name: /turn sound on/i })).toBeInTheDocument();
    expect(localStorage.getItem("sound-preference")).toBe("off");
  });

  it("sits beside the theme toggle in the header", () => {
    setup();
    const themeBtn = screen.getByRole("button", { name: /switch to dark mode/i });
    const soundBtn = screen.getByRole("button", { name: /turn sound on/i });
    expect(themeBtn.parentElement).toBe(soundBtn.parentElement);
    expect(themeBtn.nextElementSibling).toBe(soundBtn);
  });
});

// ── Offline Mode: PARKED ──────────────────────────────────────────────────────
// Parked 2026-08-04. The drawer toggle and its help modal are removed from the
// Shell, so the mode is unreachable from the UI and the nav guard is inert. The
// hook, provider and outbox remain wired but dormant (`active` defaults to false)
// — see .claude/aiHelper/offlineFeature-handoff.md and ADR 0010.
//
// These tests are the guard against a partial revival: re-adding the toggle
// without its navigation confirmation would send a player who goes offline
// straight to a connection-error page and lose their round. Whoever un-parks the
// feature must delete this block and restore the suite it replaced (see the
// parking commit), not weaken it.

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

describe("Offline Mode — parked", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes no Offline Mode toggle in the drawer", async () => {
    const { user } = setupOffline();
    const nav = await openDrawer(user);
    expect(within(nav).queryByRole("switch", { name: OFFLINE_TOGGLE_NAME }))
      .not.toBeInTheDocument();
  });

  it("exposes no Σύνδεση section or help affordance", async () => {
    const { user } = setupOffline();
    const nav = await openDrawer(user);
    expect(within(nav).queryByText(/^Σύνδεση$/)).not.toBeInTheDocument();
    expect(within(nav).queryByRole("button", { name: /τι είναι/i })).not.toBeInTheDocument();
  });

  it("never confirms on navigation — the mode cannot be activated", async () => {
    // With no toggle there is no way to reach `active: true`, so every in-app link
    // must navigate straight through exactly as it did before the feature existed.
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);

    const { user } = setupOffline();
    const nav = await openDrawer(user);
    await user.click(within(nav).getByRole("link", { name: /leksiarxeio/i }));

    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("prefetches nothing on drawer open", async () => {
    // Activation was the only prefetch trigger. Nothing should warm routes now.
    const { user } = setupOffline();
    await openDrawer(user);
    expect(prefetch.mock.calls.map(([href]) => href)).not.toContain("/leksokipos");
  });
});
