// profilePage.test.tsx — /profile composition.
//
// The page itself owns almost no logic; what it owns is SCOPE. Every stat and
// trophy below the identity card is Leksokipos-only, and TICKET-02 makes that
// structural rather than a sentence: the Trophy Case and Λέξεις ανά μήκος live
// inside one labelled game section. Tabs are deliberately NOT used — a second
// earning game is what would justify them, and none exists yet.

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GAME_REGISTRY } from "@/config/games";

// Identity is client-only (localStorage + Supabase session); the page gates every
// panel on mount and reads all of it through this one hook.
vi.mock("@/hooks/usePlayerIdentity", () => ({
  usePlayerIdentity: () => ({
    deviceId:            "dev-A",
    displayName:         "Δοκιμή",
    profileLinked:       true,
    authLinked:          false,
    authUserName:        null,
    createProfile:       vi.fn(),
    generateTransferCode: vi.fn(),
    claimTransferCode:   vi.fn(),
    disconnect:          vi.fn(),
    signInWithGoogle:    vi.fn(),
    signOut:             vi.fn(),
  }),
}));

const ProfilePage = (await import("@/app/profile/page")).default;

afterEach(() => vi.restoreAllMocks());

/** Every child panel reads from the API on mount; none of that is under test here. */
function stubFetch() {
  vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    let body: unknown = {};
    if (url.includes("/api/achievements")) body = { earned: [] };
    // Real response shapes, not loose stubs: both cards read fields off the parsed
    // body without guarding, so a wrong shape throws during render and the whole
    // page comes back empty — which looks exactly like a missing section.
    else if (url.includes("/api/profile/words")) {
      body = { total: 0, buckets: [{ key: "10", minLength: 10, count: 0 }] };
    } else if (url.includes("/api/profile/stats")) {
      body = {
        total_points: 0, puzzles_played: 0, leksokipos_points: 0,
        pangram_count: 0, top_rank_count: 0, tzimani_count: 0,
      };
    }
    return Promise.resolve({ ok: true, json: async () => body } as Response);
  });
}

describe("/profile — the Leksokipos section", () => {
  it("wraps the Trophy Case and Λέξεις ανά μήκος in one labelled game section", async () => {
    stubFetch();
    render(<ProfilePage />);

    const section = screen.getByTestId("leksokipos-section");
    expect(section).toHaveTextContent(GAME_REGISTRY.leksokipos.label);
    // Both surfaces sit INSIDE it — that containment is the whole point, because it
    // is what makes "badges are Leksokipos-only" unambiguous without a caveat line.
    // The words card renders a skeleton until its fetch lands, hence the await.
    expect(section).toContainElement(screen.getByText("Προθήκη Τροπαίων"));
    expect(section).toContainElement(await screen.findByText("Λέξεις ανά μήκος"));
  });

  it("labels the section with a heading, not a tab strip", () => {
    // Tabs imply a sibling to switch to. There is exactly one earning game, so a
    // tab strip would advertise a choice that does not exist.
    stubFetch();
    render(<ProfilePage />);

    const heading = screen.getByTestId("leksokipos-section-heading");
    expect(heading).toHaveTextContent(GAME_REGISTRY.leksokipos.label);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});
