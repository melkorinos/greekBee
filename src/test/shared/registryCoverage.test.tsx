// registryCoverage.test.tsx
// Guards the contract that GAME_REGISTRY is the single source of truth for every
// Game-keyed surface on the Platform — not just the presentational fields it
// already owns.
//
// The bug class: a new Game is added to the registry, and the surfaces that need
// to know about it are hand-typed lists the compiler never checks against it.
// Session 121 hit exactly this — `topothesies` had to be added to the drawer's
// id array by hand, and nothing failed until someone noticed.
//
// Three seams, one per surface that must never diverge from the registry:
//   1. Shell drawer  — asserted by injecting a probe Game into the registry
//   2. globals.css   — asserted by scanning the [data-game] accent rules
//   3. leaderboards  — asserted against the config keyed by LeaderboardGameId
//
// Behavioural drawer tests (open/close, Escape, link click) stay in Shell.test.tsx;
// this file owns only the registry→surface contracts, which is why it may mock the
// registry for the whole module.

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "fs";
import { resolve } from "path";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter:   () => ({ push: vi.fn(), back: vi.fn(), prefetch: vi.fn().mockResolvedValue(undefined) }),
}));

// A Game that exists ONLY inside this test's registry. Every assertion below is
// about the probe rather than about today's ten games: asserting the real ids
// would pass against a hand-typed list that merely happens to be complete, and
// would go stale the moment the roster changes. The probe cannot be hand-typed
// anywhere, so it fails unless the surface genuinely derives from the registry.
const PROBE_HREF = "/probe-game";

vi.mock("@/config/games", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/games")>();
  return {
    ...actual,
    GAME_REGISTRY: {
      ...actual.GAME_REGISTRY,
      probegame: {
        label:       "🧪 Probe",
        emoji:       "🧪",
        title:       "Probe",
        description: "Test-only Game injected by registryCoverage.test.tsx.",
        href:        PROBE_HREF,
        wip:         false,
      },
    },
  };
});

const { Shell }               = await import("@/components/shared/Shell");
const { OfflineModeProvider } = await import("@/hooks/useOfflineMode");

async function openDrawer() {
  const user = userEvent.setup();
  render(
    <OfflineModeProvider>
      <Shell><p>content</p></Shell>
    </OfflineModeProvider>,
  );
  await user.click(screen.getByRole("button", { name: /open menu/i }));
  const nav = screen.getByRole("navigation", { name: /game navigation/i });
  return within(nav).getAllByRole("link").map((l) => l.getAttribute("href"));
}

// ── Seam 1: Shell drawer ──────────────────────────────────────────────────────

describe("registry coverage — Shell drawer", () => {
  it("lists a Game that exists only in the registry", async () => {
    const hrefs = await openDrawer();

    expect(
      hrefs,
      "The drawer did not render a Game present in GAME_REGISTRY. Shell must " +
        "derive its nav from the registry (Object.keys) rather than from a " +
        "hand-typed id array — otherwise adding a Game silently skips the nav.",
    ).toContain(PROBE_HREF);
  });
});

// ── Seam 2: per-game accent tokens in globals.css ─────────────────────────────
// The probe trick cannot work here: a stylesheet has no way to grow a rule for a
// mocked Game, so this seam is checked against the REAL registry. It is a
// regression guard rather than a derivation test — CSS is exactly the surface a
// widened registry row could never reach, which is why it needs one.

const { GAME_REGISTRY: REAL_REGISTRY } =
  await vi.importActual<typeof import("@/config/games")>("@/config/games");

const REAL_GAME_IDS = Object.keys(REAL_REGISTRY);

describe("registry coverage — globals.css accents", () => {
  const css = readFileSync(resolve(__dirname, "../../../src/app/globals.css"), "utf8");

  function hasAccentRule(id: string): boolean {
    return new RegExp(`\\[data-game="${id}"\\]`).test(css);
  }

  it("matches nothing for an id that is not a Game (guard is actually running)", () => {
    // Both halves matter: an empty registry would make every check below pass
    // vacuously, and a matcher that matches everything would too.
    expect(REAL_GAME_IDS.length).toBeGreaterThan(5);
    expect(hasAccentRule("probegame")).toBe(false);
  });

  it("every registered Game has a --game-accent rule", () => {
    const missing = REAL_GAME_IDS.filter((id) => !hasAccentRule(id));

    expect(
      missing,
      "These Games are in GAME_REGISTRY but have no [data-game] accent rule in " +
        "globals.css, so GamePageShell will fall back to the platform accent " +
        "(ADR 0009). Add one line per Game:\n" +
        missing.map((id) => `[data-game="${id}"] { --game-accent: …; --game-accent-foreground: …; }`).join("\n"),
    ).toEqual([]);
  });

  it("has no accent rule for a Game that no longer exists", () => {
    const declared = [...css.matchAll(/\[data-game="([^"]+)"\]/g)].map((m) => m[1]);
    const orphans  = declared.filter((id) => !REAL_GAME_IDS.includes(id));

    expect(
      orphans,
      `globals.css declares accents for ids that are not in GAME_REGISTRY: ${orphans.join(", ")}`,
    ).toEqual([]);
  });
});

// ── Seam 3: leaderboard config ────────────────────────────────────────────────
// LeaderboardGameId is `Exclude<RegistryGameId, …NO_LEADERBOARD_IDS>`, so a newly
// registered Game widens it automatically and the `Record<LeaderboardGameId, …>`
// on the config stops compiling until that Game gets a row or an exclusion. That
// break is a COMPILE-time guarantee (npm run build); what this seam adds at
// runtime is the other direction — that the exclusions still name real Games, and
// that the config has not drifted from the registry some other way.

const { LEADERBOARD_GAME_IDS, NO_LEADERBOARD_IDS } =
  await import("@/components/shared/GameLeaderboardModal");

describe("registry coverage — leaderboards", () => {
  it("every registered Game either has a leaderboard config or is deliberately excluded", () => {
    const covered  = [...LEADERBOARD_GAME_IDS, ...NO_LEADERBOARD_IDS];
    const uncovered = REAL_GAME_IDS.filter((id) => !covered.includes(id as never));

    expect(
      uncovered,
      "These Games are in GAME_REGISTRY but have neither a row in " +
        "GAME_LEADERBOARD_CONFIG nor a place in NO_LEADERBOARD_IDS: " +
        uncovered.join(", "),
    ).toEqual([]);
  });

  it("every deliberately excluded id is still a registered Game", () => {
    const stale = NO_LEADERBOARD_IDS.filter((id) => !REAL_GAME_IDS.includes(id));

    expect(
      stale,
      `NO_LEADERBOARD_IDS names ids that are no longer in GAME_REGISTRY: ${stale.join(", ")}`,
    ).toEqual([]);
  });

  it("does not exclude a Game that already has a leaderboard config", () => {
    const both = NO_LEADERBOARD_IDS.filter((id) => LEADERBOARD_GAME_IDS.includes(id as never));
    expect(both, `Ids in both NO_LEADERBOARD_IDS and the config: ${both.join(", ")}`).toEqual([]);
  });
});
