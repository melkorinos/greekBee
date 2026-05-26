// Tests for the Leksikastirio page — fetch lifecycle, tab switching, empty/error states.

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import LeksikastiríoPage from "@/app/leksikastirio/page";
import type { Nomination } from "@/components/leksikastirio/NominationCard";
import userEvent from "@testing-library/user-event";

// ── next/navigation mock ──────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const fakeNominations: Nomination[] = [
  {
    id:             "id-1",
    word:           "αγαπη",
    player_name:    "Νίκος",
    note:           "test note",
    upvote_count:   3,
    downvote_count: 1,
    created_at:     "2026-01-01T00:00:00Z",
  },
  {
    id:             "id-2",
    word:           "ελπιδα",
    player_name:    null,
    note:           null,
    upvote_count:   0,
    downvote_count: 0,
    created_at:     "2026-01-02T00:00:00Z",
  },
];

function mockFetch(data: unknown, ok = true) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    json: async () => data,
  } as Response);
}

afterEach(() => vi.restoreAllMocks());

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("Leksikastirio page — rendering", () => {
  it("shows nominations returned by the API", async () => {
    mockFetch(fakeNominations);
    render(<LeksikastiríoPage />);
    // The <td> has the Tailwind `uppercase` class — visual only, DOM text is lowercase.
    await waitFor(() => expect(screen.getByText("αγαπη")).toBeInTheDocument());
    expect(screen.getByText("ελπιδα")).toBeInTheDocument();
  });

  it("shows empty state when API returns an empty array", async () => {
    mockFetch([]);
    render(<LeksikastiríoPage />);
    await waitFor(() =>
      expect(screen.getByText("Δεν υπάρχουν ακόμα προτάσεις για προσθήκη.")).toBeInTheDocument(),
    );
  });

  it("shows empty state (does not crash) when API returns an error object", async () => {
    mockFetch({ error: "db_error" });
    render(<LeksikastiríoPage />);
    await waitFor(() =>
      expect(screen.getByText("Δεν υπάρχουν ακόμα προτάσεις για προσθήκη.")).toBeInTheDocument(),
    );
  });
});

// ── Tab switching ─────────────────────────────────────────────────────────────

describe("Leksikastirio page — tabs", () => {
  it("fetches with direction=add on initial load", async () => {
    const fetchSpy = mockFetch([]);
    render(<LeksikastiríoPage />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(fetchSpy.mock.calls[0][0]).toContain("direction=add");
  });

  it("fetches with direction=remove when remove tab is clicked", async () => {
    const fetchSpy = mockFetch([]);
    const user = userEvent.setup();
    render(<LeksikastiríoPage />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());
    await user.click(screen.getByTestId("tab-remove"));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    expect(fetchSpy.mock.calls[1][0]).toContain("direction=remove");
  });

  it("shows remove empty state after switching to remove tab", async () => {
    mockFetch([]);
    const user = userEvent.setup();
    render(<LeksikastiríoPage />);
    await user.click(screen.getByTestId("tab-remove"));
    await waitFor(() =>
      expect(screen.getByText("Δεν υπάρχουν ακόμα αναφορές για αφαίρεση.")).toBeInTheDocument(),
    );
  });
});

// ── Optimistic vote update ────────────────────────────────────────────────────

describe("Leksikastirio page — optimistic voting", () => {
  it("increments upvote count immediately on upvote click", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => fakeNominations } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, action: "added" }) } as Response);

    const user = userEvent.setup();
    render(<LeksikastiríoPage />);
    await waitFor(() => expect(screen.getByText("αγαπη")).toBeInTheDocument());

    // upvote_count starts at 3 — button shows "▲ 3"
    const upBtn = screen.getAllByTestId("vote-up-button")[0];
    expect(upBtn).toHaveTextContent("3");

    await user.click(upBtn);
    await waitFor(() => expect(upBtn).toHaveTextContent("4"));
  });

  it("decrements upvote count on undo (same button clicked twice)", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => fakeNominations } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, action: "added" }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, action: "removed" }) } as Response);

    const user = userEvent.setup();
    render(<LeksikastiríoPage />);
    await waitFor(() => expect(screen.getByText("αγαπη")).toBeInTheDocument());

    const upBtn = screen.getAllByTestId("vote-up-button")[0];
    await user.click(upBtn); // vote → 4
    await waitFor(() => expect(upBtn).toHaveTextContent("4"));
    await user.click(upBtn); // undo → 3
    await waitFor(() => expect(upBtn).toHaveTextContent("3"));
  });
});
