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
//   3. capabilities  — asserted against the registry's opt-in behaviour field
//
// Seams 1 and 2 are PRESENTATION, which derives: the probe Game must show up
// without anyone naming it. Seam 3 is BEHAVIOUR, which enrols: the probe Game must
// stay inert, and the surfaces must match what the registry rows declare.
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
        href:         PROBE_HREF,
        wip:          false,
        capabilities: [],
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

// ── Seam 3: capabilities ──────────────────────────────────────────────────────
// Behaviour is opt-IN: LeaderboardGameId and ScoreSubmissionGameId are now the
// Games whose registry row DECLARES the capability, so a newly registered Game can
// neither post a Score nor open a board until someone edits src/config/games.ts.
// The `Record<LeaderboardGameId, …>` on GAME_LEADERBOARD_CONFIG makes granting
// `leaderboard` without a config row a COMPILE error (npm run build); what this
// seam adds at runtime is the other direction — a config row for a Game that no
// longer declares the capability — plus the capability set's own sanity.

const { LEADERBOARD_GAME_IDS } = await import("@/components/shared/GameLeaderboardModal");
const { gameIdsWith } = await vi.importActual<typeof import("@/config/games")>("@/config/games");

describe("registry coverage — capabilities", () => {
  it("the leaderboard config covers exactly the Games declaring `leaderboard`", () => {
    const declared = gameIdsWith("leaderboard");

    expect(
      [...LEADERBOARD_GAME_IDS].sort(),
      "GAME_LEADERBOARD_CONFIG has drifted from the `leaderboard` capability in " +
        "GAME_REGISTRY. Every Game declaring it needs a config row, and a row " +
        "must not outlive the declaration.",
    ).toEqual([...declared].sort());
  });

  it("declares only known capabilities, and never the same one twice", () => {
    const known = ["scores", "leaderboard"];

    for (const id of REAL_GAME_IDS) {
      const caps = REAL_REGISTRY[id as keyof typeof REAL_REGISTRY].capabilities as readonly string[];
      expect(caps.filter((c) => !known.includes(c)), `${id} declares an unknown capability`).toEqual([]);
      expect(new Set(caps).size, `${id} repeats a capability`).toBe(caps.length);
    }
  });

  it("grants no Game a leaderboard it can never fill", () => {
    // A board with nothing to rank on it. The reverse (scores without a board) is
    // allowed in principle — but nothing does it today, and this catches the typo
    // where a row gets `leaderboard` alone.
    const unfillable = gameIdsWith("leaderboard").filter(
      (id) => !gameIdsWith("scores").includes(id as never),
    );

    expect(
      unfillable,
      `These Games declare \`leaderboard\` but not \`scores\`, so their board can ` +
        `never receive a row: ${unfillable.join(", ")}`,
    ).toEqual([]);
  });
});
