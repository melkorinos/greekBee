// WordsByLengthCard — the "Λέξεις ανά μήκος" distribution card on /profile.
//
// Fetches GET /api/profile/words on mount. Shows a skeleton while loading, a total
// plus a per-length bar for each bucket (4…9 individually + "10+") on success, an
// honest empty state when the device has found nothing (no backfill exists — the
// copy must not imply history), and degrades to dashes on error without blocking.

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WordsByLengthCard } from "@/components/profile/WordsByLengthCard";

afterEach(() => vi.restoreAllMocks());

function mockWords(body: unknown, ok = true) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

/** A full { total, buckets } response with the given per-key counts (missing = 0). */
function response(counts: Record<string, number>) {
  const keys = ["4", "5", "6", "7", "8", "9", "10+"];
  const buckets = keys.map((key, i) => ({
    key,
    minLength: key === "10+" ? 10 : 4 + i,
    count: counts[key] ?? 0,
  }));
  const total = buckets.reduce((s, b) => s + b.count, 0);
  return { total, buckets };
}

describe("WordsByLengthCard", () => {
  it("shows the total and a labelled row per length bucket on success", async () => {
    // Counts chosen to not collide with any length label (4…9) under getByText.
    mockWords(response({ "4": 12, "5": 20, "7": 33, "10+": 11 }));
    render(<WordsByLengthCard deviceId="dev-A" />);

    // Total (76) and the section heading.
    await waitFor(() => expect(screen.getByText("Λέξεις ανά μήκος")).toBeInTheDocument());
    expect(screen.getByText("76")).toBeInTheDocument();

    // Every bucket row is present, including the "10+" tail and zeroed lengths.
    expect(screen.getByText("10+")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument(); // zero-count length still shown
    // The counts for populated buckets render.
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("33")).toBeInTheDocument();
  });

  it("shows a skeleton while the fetch is pending", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {})); // never resolves
    render(<WordsByLengthCard deviceId="dev-A" />);
    expect(screen.getByTestId("words-by-length-skeleton")).toBeInTheDocument();
  });

  it("shows an honest empty state (no implied history) when nothing has been found", async () => {
    mockWords(response({}));
    render(<WordsByLengthCard deviceId="dev-A" />);
    await waitFor(() => expect(screen.queryByTestId("words-by-length-skeleton")).toBeNull());
    expect(screen.getByTestId("words-by-length-empty")).toBeInTheDocument();
  });

  it("degrades to a dash total on fetch error without blocking", async () => {
    mockWords({}, false); // ok: false
    render(<WordsByLengthCard deviceId="dev-A" />);
    await waitFor(() => expect(screen.queryByTestId("words-by-length-skeleton")).toBeNull());
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
