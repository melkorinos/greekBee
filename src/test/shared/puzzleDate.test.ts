// puzzleDate.test.ts — the platform's puzzle-date helpers.

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getLast7Dates,
  nextFreeScheduledDate,
  normalizePuzzleDate,
  resolvePuzzleDateParam,
  todayISO,
} from "@/lib/puzzleDate";

describe("todayISO", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a YYYY-MM-DD date string", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("reads the UTC date, not the local one", () => {
    // 00:30 UTC on the 15th. Any local-time reading east of UTC still says the
    // 15th, so the discriminating case is a *westward* offset, where local time
    // is still the 14th.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T00:30:00Z"));
    expect(todayISO()).toBe("2026-07-15");
  });

  it("rolls over at UTC midnight — 23:59 UTC is still the same day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T23:59:59Z"));
    expect(todayISO()).toBe("2026-07-15");
  });

  it("does not roll over at Athens midnight (UTC+3 in July)", () => {
    // 00:30 Athens on the 16th = 21:30 UTC on the 15th. The daily puzzle
    // deliberately still serves the 15th until 03:00 Athens time.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T21:30:00Z"));
    expect(todayISO()).toBe("2026-07-15");
  });
});

describe("normalizePuzzleDate", () => {
  it("passes through a plain date unchanged", () => {
    expect(normalizePuzzleDate("2026-05-22")).toBe("2026-05-22");
  });

  it("strips a lowercase two-letter locale suffix", () => {
    expect(normalizePuzzleDate("2026-05-22-el")).toBe("2026-05-22");
  });

  it("strips an uppercase locale suffix (case-insensitive regex)", () => {
    expect(normalizePuzzleDate("2026-05-22-EL")).toBe("2026-05-22");
  });

  it("strips a mixed-case locale suffix", () => {
    expect(normalizePuzzleDate("2026-05-22-El")).toBe("2026-05-22");
  });

  it("returns empty string for null", () => {
    expect(normalizePuzzleDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(normalizePuzzleDate(undefined)).toBe("");
  });

  it("returns empty string for an empty string", () => {
    expect(normalizePuzzleDate("")).toBe("");
  });
});

describe("resolvePuzzleDateParam", () => {
  const today = "2026-07-15";

  it("passes through a valid YYYY-MM-DD param", () => {
    expect(resolvePuzzleDateParam("2026-07-10", today)).toBe("2026-07-10");
  });

  it("falls back to today when the param is undefined", () => {
    expect(resolvePuzzleDateParam(undefined, today)).toBe(today);
  });

  it("falls back to today for a malformed date", () => {
    expect(resolvePuzzleDateParam("not-a-date", today)).toBe(today);
  });

  it("falls back to today for an empty string", () => {
    expect(resolvePuzzleDateParam("", today)).toBe(today);
  });

  it("falls back to today for a date-like string with extra characters", () => {
    expect(resolvePuzzleDateParam("2026-07-10T00:00:00", today)).toBe(today);
  });
});

describe("nextFreeScheduledDate", () => {
  const today = "2026-07-15";

  it("schedules for tomorrow when nothing is booked", () => {
    expect(nextFreeScheduledDate([], today)).toBe("2026-07-16");
  });

  it("never schedules for today, even with an empty calendar", () => {
    // The product rule: an approved puzzle always lands on a future date, so it
    // can never replace the puzzle players are already mid-round on.
    expect(nextFreeScheduledDate([], today)).not.toBe(today);
  });

  it("skips past a booked tomorrow", () => {
    expect(nextFreeScheduledDate(["2026-07-16"], today)).toBe("2026-07-17");
  });

  it("fills a gap in the middle of a booked run", () => {
    expect(nextFreeScheduledDate(["2026-07-16", "2026-07-18"], today)).toBe("2026-07-17");
  });

  it("walks past a fully booked run to the first free day after it", () => {
    expect(
      nextFreeScheduledDate(["2026-07-16", "2026-07-17", "2026-07-18"], today),
    ).toBe("2026-07-19");
  });

  it("ignores booked dates in the past — they can never collide", () => {
    expect(nextFreeScheduledDate(["2026-07-10", "2026-07-14", today], today)).toBe("2026-07-16");
  });

  it("is order-independent — the caller's rows arrive in no guaranteed order", () => {
    expect(
      nextFreeScheduledDate(["2026-07-18", "2026-07-16", "2026-07-17"], today),
    ).toBe("2026-07-19");
  });

  it("steps across a month boundary", () => {
    expect(nextFreeScheduledDate(["2026-07-31"], "2026-07-30")).toBe("2026-08-01");
  });

  it("steps across a year boundary", () => {
    expect(nextFreeScheduledDate([], "2026-12-31")).toBe("2027-01-01");
  });

  it("tolerates nulls in the booked list — scheduled_date is a nullable column", () => {
    expect(nextFreeScheduledDate([null, "2026-07-16", null], today)).toBe("2026-07-17");
  });
});

describe("getLast7Dates", () => {
  it("starts at today, so the strip always has a 'Σήμερα' pill", () => {
    // The regression. The old local-midnight parse serialised back one day
    // early for every viewer east of UTC — the whole Greek audience — so the
    // leftmost pill was yesterday and 'Σήμερα' never rendered.
    expect(getLast7Dates("2026-07-16")[0]).toBe("2026-07-16");
  });

  it("returns n consecutive calendar days, newest-first", () => {
    expect(getLast7Dates("2026-07-16")).toEqual([
      "2026-07-16", "2026-07-15", "2026-07-14", "2026-07-13",
      "2026-07-12", "2026-07-11", "2026-07-10",
    ]);
  });

  it("steps across a month boundary", () => {
    expect(getLast7Dates("2026-03-02", 3)).toEqual(["2026-03-02", "2026-03-01", "2026-02-28"]);
  });

  it("is independent of the machine timezone", () => {
    // Guards both directions: local-clock arithmetic breaks east of UTC, and a
    // half-converted UTC parse breaks west of it.
    for (const tz of ["UTC", "Europe/Athens", "Asia/Tokyo", "America/New_York", "Pacific/Honolulu"]) {
      vi.stubEnv("TZ", tz);
      expect(getLast7Dates("2026-07-16")[0]).toBe("2026-07-16");
    }
    vi.unstubAllEnvs();
  });
});
