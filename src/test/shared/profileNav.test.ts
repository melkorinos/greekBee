// profileNav.test.ts — the pure decision behind the header 👤 button's toggle.
//
// The button is a toggle: from anywhere it opens /profile; while ON /profile it
// takes you back to the page you came from (router.back()). If there is no in-app
// history to return to (a deep link or a hard refresh landed straight on /profile),
// it falls back to the home picker instead of leaving the site.

import { describe, expect, it } from "vitest";

import { resolveProfileNav, PROFILE_PATH } from "@/lib/profileNav";

describe("resolveProfileNav", () => {
  it("opens /profile from any other page", () => {
    expect(resolveProfileNav("/", true)).toEqual({ kind: "push", href: PROFILE_PATH });
    expect(resolveProfileNav("/leksokipos", false)).toEqual({ kind: "push", href: PROFILE_PATH });
  });

  it("goes back when already on /profile and there is in-app history", () => {
    expect(resolveProfileNav(PROFILE_PATH, true)).toEqual({ kind: "back" });
  });

  it("falls back to the home picker on /profile with no in-app history", () => {
    // Deep link / refresh straight onto /profile — back() would leave the site.
    expect(resolveProfileNav(PROFILE_PATH, false)).toEqual({ kind: "push", href: "/" });
  });
});
