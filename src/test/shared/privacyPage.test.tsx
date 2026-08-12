// privacyPage.test.tsx — /privacy (TICKET-07).
//
// This page is a PUBLIC STATEMENT about what the code does, so the tests here are
// not "does it render". They are guards on the individual claims, each aimed at
// the specific way that claim could quietly become false:
//
//   · the retention number      → drifts if someone retypes it instead of importing
//   · the controller details    → drift if someone inlines them
//   · "no third-party tracking" → falsified by an `npm install`, nowhere near this file
//   · reachability              → the drawer link is the only entry point (Shell.test.tsx)
//
// The dependency guard is the important one. The original ticket worried that
// installing an error monitor after this page shipped would make it lie and that
// "nothing in the test suite will notice". This is the notice.

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { render, screen } from "@testing-library/react";
import { resolve } from "path";

import PrivacyPage from "@/app/privacy/page";
import { CONTACT_EMAIL, CONTROLLER_NAME } from "@/config/platform";
import { SESSION_RETENTION_DAYS } from "@/config/retention";

const ROOT = resolve(__dirname, "../../../");
const PAGE_SRC = readFileSync(resolve(ROOT, "src/app/privacy/page.tsx"), "utf8");

// ── Content ───────────────────────────────────────────────────────────────────

describe("/privacy — the claims", () => {
  it("names the controller and a contact address, both from config", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(new RegExp(CONTROLLER_NAME))).toBeInTheDocument();
    expect(screen.getAllByText(CONTACT_EMAIL).length).toBeGreaterThan(0);
  });

  it("renders the address as plain text, never as a mailto: link", () => {
    render(<PrivacyPage />);
    // A public hobby address in a mailto: is scraper bait — decision 1 of the
    // TICKET-07 grill. Humans read this page; harvesters should not profit from it.
    expect(screen.queryByRole("link", { name: new RegExp(CONTACT_EMAIL) })).not.toBeInTheDocument();
    expect(PAGE_SRC).not.toContain("mailto:");
  });

  it("states the retention window from src/config/retention.ts", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(new RegExp(`${SESSION_RETENTION_DAYS}\\s*ημέρες`))).toBeInTheDocument();
  });

  it("imports the retention constant rather than retyping the number", () => {
    expect(
      PAGE_SRC,
      "The privacy page must import SESSION_RETENTION_DAYS. A second hardcoded " +
        "copy is how a published legal claim silently outlives the config it describes.",
    ).toContain("SESSION_RETENTION_DAYS");
  });

  it("discloses FormSubmit by name — it is a real third-party processor", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/FormSubmit/)).toBeInTheDocument();
  });

  it("says plainly that scores outlive the pruning window", () => {
    render(<PrivacyPage />);
    // ADR 0012: game_scores is append-forever because lifetime stats and streaks
    // derive from the full history. The page must not imply otherwise.
    expect(screen.getByText(/όσο υπάρχουν τα παιχνίδια/)).toBeInTheDocument();
  });

  it("tells the player how deletion actually works — by hand, no button", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/με το\s+χέρι/)).toBeInTheDocument();
  });
});

// ── The claim this file exists to defend ──────────────────────────────────────

describe("/privacy — 'no analytics, no third-party tracking' stays true", () => {
  // Every production dependency ships JavaScript to players. This list is the
  // whole reason the page can claim no tracking, so it is pinned. A new entry
  // here is not necessarily wrong — but it must be a deliberate act that also
  // revisits the page, which is exactly what failing this test forces.
  const ALLOWED = ["@supabase/supabase-js", "next", "react", "react-dom"];

  it("ships no production dependency that could send player data to a third party", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
    const actual = Object.keys(pkg.dependencies ?? {}).sort();

    expect(
      actual,
      "Production dependencies changed. /privacy tells players there is no " +
        "analytics and no third-party tracking, and TICKET-08 records the decision " +
        "to keep it that way (Vercel's built-in observability only, no error SDK). " +
        "If this addition is intentional, update the privacy page IN THE SAME " +
        "CHANGE, then update this list.",
    ).toEqual([...ALLOWED].sort());
  });
});
