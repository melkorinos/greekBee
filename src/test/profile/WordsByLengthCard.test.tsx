// WordsByLengthCard — the "Λέξεις ανά μήκος" distribution card on /profile.
//
// Fetches GET /api/profile/words on mount. Shows a skeleton while loading, a total
// plus a per-length bar for each bucket (10, 11, 12 individually + "13+") on success,
// an honest empty state when the device has found nothing (no backfill exists — the
// copy must not imply history), and degrades to dashes on error without blocking.

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WordsByLengthCard } from "@/components/profile/WordsByLengthCard";
import { WORDS_MIN_TRACKED } from "@/lib/wordsByLength";

afterEach(() => vi.restoreAllMocks());

function mockWords(body: unknown, ok = true) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

/** A full { total, buckets } response with the given per-key counts (missing = 0). */
function response(counts: Record<string, number>) {
  const keys = ["10", "11", "12", "13+"];
  const buckets = keys.map((key, i) => ({
    key,
    minLength: 10 + i,
    count: counts[key] ?? 0,
  }));
  const total = buckets.reduce((s, b) => s + b.count, 0);
  return { total, buckets };
}

describe("WordsByLengthCard", () => {
  it("shows the total and a labelled row per length bucket on success", async () => {
    // Counts chosen to not collide with any length label (10…13) under getByText.
    mockWords(response({ "10": 42, "11": 20, "13+": 33 }));
    render(<WordsByLengthCard deviceId="dev-A" />);

    // Total (95) and the section heading.
    await waitFor(() => expect(screen.getByText("Λέξεις ανά μήκος")).toBeInTheDocument());
    expect(screen.getByText("95")).toBeInTheDocument();

    // Every bucket row is present, including the "13+" tail and zeroed lengths.
    expect(screen.getByText("13+")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument(); // zero-count length still shown
    // The counts for populated buckets render.
    expect(screen.getByText("42")).toBeInTheDocument();
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
    // A total of 0 is only honest if the card says WHY short finds never counted.
    expect(screen.getByTestId("words-by-length-empty")).toHaveTextContent(
      `${WORDS_MIN_TRACKED}+ γράμματα`,
    );
  });

  it("names the tracked-length floor whether or not anything has been found", async () => {
    mockWords(response({ 11: 2 }));
    render(<WordsByLengthCard deviceId="dev-A" />);
    await waitFor(() => expect(screen.queryByTestId("words-by-length-skeleton")).toBeNull());
    expect(screen.getByTestId("words-by-length-floor")).toHaveTextContent(
      `${WORDS_MIN_TRACKED}+ γράμματα`,
    );
  });

  it("degrades to a dash total on fetch error without blocking", async () => {
    mockWords({}, false); // ok: false
    render(<WordsByLengthCard deviceId="dev-A" />);
    await waitFor(() => expect(screen.queryByTestId("words-by-length-skeleton")).toBeNull());
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
