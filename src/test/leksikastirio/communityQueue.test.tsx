// Tests for the admin review verb of the Community Puzzle Lifecycle — the one
// CommunityQueueCard shell serving all four queues. The per-game part is the
// body; the wire (URL, X-Admin-Secret, PATCH body) is the shell's and is
// asserted once per game here, since that wire is what ADR 0016 changed.

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

import LeksikastiríoPage from "@/app/leksikastirio/page";
import userEvent from "@testing-library/user-event";

// Admin unlock — community tabs only render for an admin.
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (k: string) => (k === "admin" ? "s3cret" : null) }),
}));

type CommunityTab = "leksiarxeio" | "leksindeseis" | "vrestifrasi" | "stavrolekso";

/** One pending row per queue, shaped as that game's API returns it. */
const QUEUE: Record<CommunityTab, Record<string, unknown>> = {
  leksiarxeio: {
    id: 11, submitter_name: "Νίκος", created_at: "2026-01-01T00:00:00Z",
    data: { "4": "ΑΓΑΠ", "5": "ΑΓΑΠΗ", "6": "ΑΓΑΠΗΣ", "7": "ΑΓΑΠΗΤΟ", "8": "ΑΓΑΠΗΤΟΣ" },
  },
  leksindeseis: {
    id: 22, submitter_name: "Μαρία", created_at: "2026-01-01T00:00:00Z",
    data: [{ category: "ΧΡΩΜΑΤΑ", words: ["ΚΟΚΚΙΝΟ", "ΜΠΛΕ", "ΠΡΑΣΙΝΟ", "ΚΙΤΡΙΝΟ"], difficulty: 1 }],
  },
  vrestifrasi: {
    id: 33, submitter_name: "Άννα", created_at: "2026-01-01T00:00:00Z",
    data: { phrase: "ΚΑΛΗ ΤΥΧΗ" },
  },
  stavrolekso: {
    id: 44, submitter_name: "Πέτρος", title: "Πρωινό", created_at: "2026-01-01T00:00:00Z",
    data: { width: 5, height: 5, blackSquares: [], slots: [{}, {}] },
  },
};

/** Routes the list GET per game and answers every review PATCH ok. */
function mockFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url  = String(input);
    const game = (Object.keys(QUEUE) as CommunityTab[]).find((g) =>
      url.includes(`/api/community-puzzles/${g}`),
    );
    const body = url.includes("/review") || !game ? {} : { puzzles: [QUEUE[game]] };
    return { ok: true, json: async () => body } as Response;
  });
}

/** Unlock the admin tabs, open `game`'s queue, and wait for its card. */
async function openQueue(game: CommunityTab) {
  const user = userEvent.setup();
  render(<LeksikastiríoPage />);
  await user.click(await screen.findByTestId(`tab-${game}`));
  return { user, card: await screen.findByTestId("community-queue-card") };
}

afterEach(() => vi.restoreAllMocks());

describe("CommunityQueueCard — the review wire", () => {
  const games = Object.keys(QUEUE) as CommunityTab[];

  it.each(games)("%s: approve PATCHes that game's review URL with the admin secret", async (game) => {
    const fetchSpy = mockFetch();
    const { user } = await openQueue(game);

    await user.click(screen.getByTestId("community-approve"));

    const call = fetchSpy.mock.calls.find(([u]) => String(u).includes("/review"));
    expect(call?.[0]).toBe(`/api/community-puzzles/${game}/${QUEUE[game].id}/review`);
    expect(call?.[1]).toMatchObject({
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": "s3cret" },
      body:    JSON.stringify({ action: "approve" }),
    });
  });

  it.each(games)("%s: reject sends action=reject", async (game) => {
    const fetchSpy = mockFetch();
    const { user } = await openQueue(game);

    await user.click(screen.getByTestId("community-reject"));

    const call = fetchSpy.mock.calls.find(([u]) => String(u).includes("/review"));
    expect(call?.[1]).toMatchObject({ body: JSON.stringify({ action: "reject" }) });
  });

  it.each(games)("%s: the reviewed row leaves the queue", async (game) => {
    mockFetch();
    const { user } = await openQueue(game);

    await user.click(screen.getByTestId("community-approve"));

    await waitFor(() => expect(screen.queryByTestId("community-queue-card")).toBeNull());
    // Vres Tin Frasi queues phrases, not παζλ — its empty state says so.
    const emptyState = game === "vrestifrasi"
      ? "Δεν υπάρχουν φράσεις σε αναμονή."
      : "Δεν υπάρχουν παζλ σε αναμονή.";
    expect(screen.getByText(emptyState)).toBeTruthy();
  });
});

describe("CommunityQueueCard — per-game bodies", () => {
  it("leksiarxeio shows a word per configured length", async () => {
    mockFetch();
    const { card } = await openQueue("leksiarxeio");
    expect(within(card).getByText("ΑΓΑΠΗΤΟΣ")).toBeTruthy();
    expect(within(card).getByText("από Νίκος")).toBeTruthy();
  });

  it("vrestifrasi shows the phrase", async () => {
    mockFetch();
    const { card } = await openQueue("vrestifrasi");
    expect(within(card).getByText("ΚΑΛΗ ΤΥΧΗ")).toBeTruthy();
  });

  it("leksindeseis shows each group's category and words", async () => {
    mockFetch();
    const { card } = await openQueue("leksindeseis");
    expect(within(card).getByText("ΧΡΩΜΑΤΑ")).toBeTruthy();
    expect(within(card).getByText("ΚΟΚΚΙΝΟ, ΜΠΛΕ, ΠΡΑΣΙΝΟ, ΚΙΤΡΙΝΟ")).toBeTruthy();
  });

  it("stavrolekso shows title and grid meta", async () => {
    mockFetch();
    const { card } = await openQueue("stavrolekso");
    expect(within(card).getByText("Πρωινό")).toBeTruthy();
    expect(within(card).getByText(/5×5 · 2 slots/)).toBeTruthy();
  });
});
