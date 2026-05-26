// Tests for NominationCard — rendering, up/down vote state, API calls, admin buttons.

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { NominationCard, type Nomination } from "@/components/leksikastirio/NominationCard";
import userEvent from "@testing-library/user-event";

// ── Fixture ───────────────────────────────────────────────────────────────────

const nomination: Nomination = {
  id:             "abc-123",
  word:           "αγαπη",
  player_name:    "Νίκος",
  note:           "Πολύ συνηθισμένη λέξη",
  upvote_count:   5,
  downvote_count: 2,
  created_at:     "2026-01-01T00:00:00Z",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(action: "added" | "removed" | "switched") {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok:   true,
    json: async () => ({ ok: true, action }),
  } as Response);
}

afterEach(() => vi.restoreAllMocks());

// NominationCard renders a <tr> — must be inside <table><tbody> for valid DOM.
function setup(overrides: Partial<Parameters<typeof NominationCard>[0]> = {}) {
  const onVote     = vi.fn();
  const onReviewed = vi.fn();
  const user       = userEvent.setup();
  render(
    <table><tbody>
      <NominationCard
        nomination={nomination}
        myDeviceId="device-1"
        currentVote={null}
        isAdmin={false}
        adminSecret=""
        onVote={onVote}
        onReviewed={onReviewed}
        {...overrides}
      />
    </tbody></table>,
  );
  return { user, onVote, onReviewed };
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("NominationCard — rendering", () => {
  it("shows the word (CSS uppercases it, DOM text is lowercase)", () => {
    setup();
    // The <td> has the Tailwind `uppercase` class — visual only, DOM stays lowercase.
    expect(screen.getByTestId("nomination-card")).toHaveTextContent("αγαπη");
  });

  it("shows player name and note", () => {
    setup();
    expect(screen.getByTestId("nomination-card")).toHaveTextContent("Νίκος");
    expect(screen.getByTestId("nomination-card")).toHaveTextContent("Πολύ συνηθισμένη λέξη");
  });

  it("shows upvote and downvote counts", () => {
    setup();
    expect(screen.getByTestId("vote-up-button")).toHaveTextContent("5");
    expect(screen.getByTestId("vote-down-button")).toHaveTextContent("2");
  });
});

// ── Vote highlight state ──────────────────────────────────────────────────────
// Active state uses bg-green-100 / bg-red-100 (no hover: prefix).
// Inactive state uses bg-stone-100 with hover:bg-green-100 / hover:bg-red-100.
// We check bg-stone-100 (inactive) vs its absence (active) to avoid matching hover classes.

describe("NominationCard — vote highlight", () => {
  it("neither button is highlighted when currentVote is null", () => {
    setup({ currentVote: null });
    expect(screen.getByTestId("vote-up-button").className).toContain("bg-stone-100");
    expect(screen.getByTestId("vote-down-button").className).toContain("bg-stone-100");
  });

  it("upvote button is highlighted when currentVote is 'up'", () => {
    setup({ currentVote: "up" });
    expect(screen.getByTestId("vote-up-button").className).not.toContain("bg-stone-100");
    expect(screen.getByTestId("vote-down-button").className).toContain("bg-stone-100");
  });

  it("downvote button is highlighted when currentVote is 'down'", () => {
    setup({ currentVote: "down" });
    expect(screen.getByTestId("vote-down-button").className).not.toContain("bg-stone-100");
    expect(screen.getByTestId("vote-up-button").className).toContain("bg-stone-100");
  });
});

// ── Voting ────────────────────────────────────────────────────────────────────

describe("NominationCard — voting", () => {
  it("calls onVote with (id, 'up', action) when upvote is clicked", async () => {
    mockFetch("added");
    const { user, onVote } = setup();
    await user.click(screen.getByTestId("vote-up-button"));
    await waitFor(() => expect(onVote).toHaveBeenCalledWith("abc-123", "up", "added"));
  });

  it("calls onVote with (id, 'down', action) when downvote is clicked", async () => {
    mockFetch("added");
    const { user, onVote } = setup();
    await user.click(screen.getByTestId("vote-down-button"));
    await waitFor(() => expect(onVote).toHaveBeenCalledWith("abc-123", "down", "added"));
  });

  it("sends voteType in the POST body", async () => {
    const fetchSpy = mockFetch("added");
    const { user } = setup();
    await user.click(screen.getByTestId("vote-down-button"));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.voteType).toBe("down");
    expect(body.deviceId).toBe("device-1");
  });

  it("passes 'removed' action from API through to onVote (undo)", async () => {
    mockFetch("removed");
    const { user, onVote } = setup({ currentVote: "up" });
    await user.click(screen.getByTestId("vote-up-button"));
    await waitFor(() => expect(onVote).toHaveBeenCalledWith("abc-123", "up", "removed"));
  });

  it("passes 'switched' action from API through to onVote", async () => {
    mockFetch("switched");
    const { user, onVote } = setup({ currentVote: "up" });
    await user.click(screen.getByTestId("vote-down-button"));
    await waitFor(() => expect(onVote).toHaveBeenCalledWith("abc-123", "down", "switched"));
  });
});

// ── Admin controls ────────────────────────────────────────────────────────────

describe("NominationCard — admin controls", () => {
  it("hides admin buttons when isAdmin is false", () => {
    setup({ isAdmin: false });
    expect(screen.queryByTestId("admin-approve")).toBeNull();
    expect(screen.queryByTestId("admin-reject")).toBeNull();
  });

  it("shows admin buttons when isAdmin is true", () => {
    setup({ isAdmin: true, adminSecret: "secret" });
    expect(screen.getByTestId("admin-approve")).toBeInTheDocument();
    expect(screen.getByTestId("admin-reject")).toBeInTheDocument();
  });

  it("calls onReviewed after clicking approve", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
    const { user, onReviewed } = setup({ isAdmin: true, adminSecret: "secret" });
    await user.click(screen.getByTestId("admin-approve"));
    await waitFor(() => expect(onReviewed).toHaveBeenCalledWith("abc-123"));
  });
});
