// nominationModal.test.tsx — tests for the shared NominationModal component.
// Covers open/close, form fields, successful POST, success state, error state.

import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { NominationModal } from "@/components/shared/NominationModal";
import { setDisplayName } from "@/hooks/useGameStore";
import userEvent from "@testing-library/user-event";

// ── fetch mock ────────────────────────────────────────────────────────────────

// Routes the new /api/nominations/lookup call separately from the POST so a
// single mock can drive both the re-proposal warning and the submission result.
function mockFetch(
  ok: boolean,
  status = ok ? 200 : 500,
  lookup: { blocked?: boolean; rejected?: number; accepted?: number; pending?: number; pendingId?: string | null } = {},
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/nominations/lookup")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          blocked:   lookup.blocked   ?? false,
          rejected:  lookup.rejected  ?? 0,
          accepted:  lookup.accepted  ?? 0,
          pending:   lookup.pending   ?? 0,
          pendingId: lookup.pendingId ?? null,
        }),
      } as Response;
    }
    return { ok, status, json: async () => ({ ok, action: "added" }) } as Response;
  });
}

// Finds the POST /api/nominations call (ignores the lookup GET).
function postCall(fetchSpy: ReturnType<typeof mockFetch>) {
  return fetchSpy.mock.calls.find(
    ([url, init]) => url === "/api/nominations" && (init as RequestInit | undefined)?.method === "POST",
  );
}

// Finds the POST /api/nominations/{id}/vote call.
function voteCall(fetchSpy: ReturnType<typeof mockFetch>) {
  return fetchSpy.mock.calls.find(
    ([url, init]) =>
      typeof url === "string" && url.includes("/vote") &&
      (init as RequestInit | undefined)?.method === "POST",
  );
}

afterEach(() => vi.restoreAllMocks());

// Name and explanation are mandatory on every nomination, so any test that wants
// to reach the POST has to fill them first. The name is cleared before typing
// because the field prefills from the saved display name when there is one.
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.clear(screen.getByTestId("nomination-modal-name"));
  await user.type(screen.getByTestId("nomination-modal-name"), "Νίκος");
  await user.type(screen.getByTestId("nomination-modal-note"), "μια κανονική εξήγηση");
}

/** Same, for the tests that drive the button with fireEvent rather than userEvent. */
function fillRequiredSync() {
  fireEvent.change(screen.getByTestId("nomination-modal-name"), { target: { value: "Νίκος" } });
  fireEvent.change(screen.getByTestId("nomination-modal-note"), { target: { value: "μια κανονική εξήγηση" } });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup(overrides: Partial<Parameters<typeof NominationModal>[0]> = {}) {
  const onClose   = vi.fn();
  const onSuccess = vi.fn();
  const user      = userEvent.setup();
  render(
    <NominationModal
      word="καλος"
      direction="add"
      isOpen={true}
      onClose={onClose}
      onSuccess={onSuccess}
      {...overrides}
    />,
  );
  return { user, onClose, onSuccess };
}

// ── Visibility ─────────────────────────────────────────────────────────────────

describe("NominationModal — visibility", () => {
  it("renders nothing when isOpen is false", () => {
    render(
      <NominationModal word="test" direction="add" isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );
    expect(screen.queryByTestId("nomination-modal")).toBeNull();
  });

  it("renders the modal when isOpen is true", () => {
    setup();
    expect(screen.getByTestId("nomination-modal")).toBeInTheDocument();
  });
});

// ── Word field ─────────────────────────────────────────────────────────────────

describe("NominationModal — word field", () => {
  it("shows the word uppercased in the readonly field", () => {
    setup();
    const wordInput = screen.getByTestId("nomination-modal-word") as HTMLInputElement;
    expect(wordInput.value).toBe("ΚΑΛΟΣ");
    expect(wordInput.readOnly).toBe(true);
  });

  it("shows an editable input when wordEditable is true", () => {
    setup({ wordEditable: true });
    const wordInput = screen.getByTestId("nomination-modal-word-input") as HTMLInputElement;
    expect(wordInput.readOnly).toBeFalsy();
  });

  it("submit posts the typed word when wordEditable is true", async () => {
    const fetchSpy = mockFetch(true);
    const { user } = setup({ wordEditable: true });
    await user.type(screen.getByTestId("nomination-modal-word-input"), "νεολογισμος");
    await fillRequired(user);
    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() => expect(postCall(fetchSpy)).toBeTruthy());
    const body = JSON.parse((postCall(fetchSpy)![1] as RequestInit).body as string);
    // Posted word is normalised: final sigma ς → σ.
    expect(body.word).toBe("νεολογισμοσ");
  });
});

// ── Copy by direction ──────────────────────────────────────────────────────────

describe("NominationModal — direction copy", () => {
  it("shows add title for direction=add", () => {
    setup({ direction: "add" });
    expect(screen.getByText("Πρότεινε λέξη")).toBeInTheDocument();
  });

  it("shows remove title for direction=remove", () => {
    setup({ direction: "remove" });
    expect(screen.getByText("Αναφορά λέξης")).toBeInTheDocument();
  });
});

// ── Close ─────────────────────────────────────────────────────────────────────

describe("NominationModal — close", () => {
  it("calls onClose when the ✕ button is clicked", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByTestId("nomination-modal-close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByTestId("nomination-modal-cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByTestId("nomination-modal-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ── Submission ────────────────────────────────────────────────────────────────

describe("NominationModal — submission", () => {
  it("calls POST /api/nominations with word, direction, name and note on submit", async () => {
    const fetchSpy = mockFetch(true);
    const { user } = setup();

    await user.type(screen.getByTestId("nomination-modal-name"), "Νίκος");
    await user.type(screen.getByTestId("nomination-modal-note"), "σημαίνει καλός");
    await user.click(screen.getByTestId("nomination-modal-submit"));

    await waitFor(() => expect(postCall(fetchSpy)).toBeTruthy());
    const [url, init] = postCall(fetchSpy)! as [string, RequestInit];
    expect(url).toBe("/api/nominations");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.word).toBe("καλοσ"); // normalised: final sigma ς → σ
    expect(body.direction).toBe("add");
    expect(body.playerName).toBe("Νίκος");
    expect(body.note).toBe("σημαίνει καλός");
    expect(typeof body.deviceId).toBe("string");
    expect(body.deviceId.length).toBeGreaterThan(0);
  });

  it("shows success state after a successful POST", async () => {
    mockFetch(true);
    const { user } = setup();
    await fillRequired(user);
    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("nomination-modal-success")).toBeInTheDocument(),
    );
  });

  it("calls onSuccess with the word after a successful POST", async () => {
    mockFetch(true);
    const { user, onSuccess } = setup();
    await fillRequired(user);
    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("καλοσ")); // normalised
  });

  // Regression: six identical `αγοραροσ` rows landed in the DB within 32 ms from
  // one device — a held Enter key firing submit repeatedly. `status` only
  // disables the button on the next render, so every handler in the burst got
  // past the duplicate checks and POSTed. A synchronous ref lock stops it.
  it("fires exactly one POST when submit is hammered (held Enter / double-click)", async () => {
    const fetchSpy = mockFetch(true);
    setup();
    fillRequiredSync();

    const btn = screen.getByTestId("nomination-modal-submit");
    // Synchronous clicks — none of the awaits inside have resolved yet.
    for (let i = 0; i < 6; i++) fireEvent.click(btn);

    await waitFor(() =>
      expect(screen.getByTestId("nomination-modal-success")).toBeInTheDocument(),
    );

    const posts = fetchSpy.mock.calls.filter(
      ([url, init]) => url === "/api/nominations" && (init as RequestInit | undefined)?.method === "POST",
    );
    expect(posts).toHaveLength(1);
  });

  it("fires exactly one vote when the upvote button is hammered", async () => {
    const fetchSpy = mockFetch(true, 200, { pending: 1, pendingId: "nom-9" });
    setup({ word: "απορ", direction: "add" });

    await waitFor(() =>
      expect(screen.getByTestId("nomination-pending-upvote")).toBeInTheDocument(),
    );
    const btn = screen.getByTestId("nomination-pending-upvote");
    for (let i = 0; i < 5; i++) fireEvent.click(btn);

    await waitFor(() =>
      expect(screen.getByTestId("nomination-modal-success")).toBeInTheDocument(),
    );

    const votes = fetchSpy.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" && url.includes("/vote") &&
        (init as RequestInit | undefined)?.method === "POST",
    );
    expect(votes).toHaveLength(1);
  });

  it("shows error message when POST fails", async () => {
    mockFetch(false);
    const { user } = setup();
    await fillRequired(user);
    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("nomination-modal-error")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("nomination-modal-success")).toBeNull();
  });

  it("does NOT call onSuccess when POST fails", async () => {
    mockFetch(false);
    const { user, onSuccess } = setup();
    await fillRequired(user);
    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("nomination-modal-error")).toBeInTheDocument(),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

// ── Mandatory name + explanation ──────────────────────────────────────────────
// Both fields used to be optional and the explanation was demanded only when
// re-proposing a rejected word. The submit button is deliberately NOT disabled
// for these two — neither has a banner, so the click has to say what is wrong.

describe("NominationModal — mandatory fields", () => {
  it("refuses to post with no name and lights the name field", async () => {
    const fetchSpy = mockFetch(true);
    const { user } = setup();

    await user.type(screen.getByTestId("nomination-modal-note"), "μια κανονική εξήγηση");
    await user.click(screen.getByTestId("nomination-modal-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("nomination-name-required")).toBeInTheDocument(),
    );
    expect(postCall(fetchSpy)).toBeFalsy();
    expect(screen.queryByTestId("nomination-modal-success")).toBeNull();
  });

  it("refuses to post with no explanation and lights the note field", async () => {
    const fetchSpy = mockFetch(true);
    const { user } = setup();

    await user.clear(screen.getByTestId("nomination-modal-name"));
    await user.type(screen.getByTestId("nomination-modal-name"), "Νίκος");
    await user.click(screen.getByTestId("nomination-modal-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("nomination-note-required")).toBeInTheDocument(),
    );
    expect(postCall(fetchSpy)).toBeFalsy();
  });

  // A one-word "ναι" clears a non-empty check and tells a reviewer nothing.
  it("refuses an explanation that is too short to mean anything", async () => {
    const fetchSpy = mockFetch(true);
    const { user } = setup();

    await user.clear(screen.getByTestId("nomination-modal-name"));
    await user.type(screen.getByTestId("nomination-modal-name"), "Νίκος");
    await user.type(screen.getByTestId("nomination-modal-note"), "ναι");
    await user.click(screen.getByTestId("nomination-modal-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("nomination-note-required")).toBeInTheDocument(),
    );
    expect(postCall(fetchSpy)).toBeFalsy();
  });

  it("clears the field error once the player fills it in, and then posts", async () => {
    const fetchSpy = mockFetch(true);
    const { user } = setup();

    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("nomination-name-required")).toBeInTheDocument(),
    );

    await fillRequired(user);
    expect(screen.queryByTestId("nomination-name-required")).toBeNull();

    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() => expect(postCall(fetchSpy)).toBeTruthy());
  });

  // A mandatory field the player has already answered elsewhere would be pure
  // friction on the in-game flag, so it starts from the saved display name.
  it("prefills the name from the saved display name", () => {
    setDisplayName("Μαρία");
    try {
      mockFetch(true);
      setup();
      expect((screen.getByTestId("nomination-modal-name") as HTMLInputElement).value).toBe("Μαρία");
    } finally {
      localStorage.clear();
    }
  });
});

// ── Re-proposal warning ─────────────────────────────────────────────────────

describe("NominationModal — re-proposal warning", () => {
  // The banner still warns, but the explanation it asks for is now the platform
  // rule rather than this word's special case — so the refusal comes from the
  // note field, not from a disabled button.
  it("warns and refuses to post when a previously-rejected word has no note", async () => {
    const fetchSpy = mockFetch(true, 200, { rejected: 2 });
    const { user } = setup({ word: "απορ", direction: "add" });

    await waitFor(() =>
      expect(screen.getByTestId("nomination-rejected-warning")).toBeInTheDocument(),
    );
    await user.clear(screen.getByTestId("nomination-modal-name"));
    await user.type(screen.getByTestId("nomination-modal-name"), "Νίκος");
    await user.click(screen.getByTestId("nomination-modal-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("nomination-note-required")).toBeInTheDocument(),
    );
    expect(postCall(fetchSpy)).toBeFalsy();
  });

  it("allows submit once an explanation is provided for a rejected word", async () => {
    const fetchSpy = mockFetch(true, 200, { rejected: 1 });
    const { user } = setup({ word: "απορ", direction: "add" });

    await waitFor(() =>
      expect(screen.getByTestId("nomination-rejected-warning")).toBeInTheDocument(),
    );
    await user.clear(screen.getByTestId("nomination-modal-name"));
    await user.type(screen.getByTestId("nomination-modal-name"), "Νίκος");
    await user.type(screen.getByTestId("nomination-modal-note"), "είναι υπαρκτή λέξη, δες λεξικό");
    await user.click(screen.getByTestId("nomination-modal-submit"));

    await waitFor(() => expect(postCall(fetchSpy)).toBeTruthy());
    const body = JSON.parse((postCall(fetchSpy)![1] as RequestInit).body as string);
    expect(body.word).toBe("απορ");
    expect(body.note).toBe("είναι υπαρκτή λέξη, δες λεξικό");
  });

  it("greys out submit and shows an upvote button for an already-pending word", async () => {
    mockFetch(true, 200, { pending: 1, pendingId: "nom-1" });
    setup({ word: "απορ", direction: "add" });

    await waitFor(() =>
      expect(screen.getByTestId("nomination-pending-info")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("nomination-rejected-warning")).toBeNull();
    // Duplicate submission is blocked at the button; upvote is offered instead.
    expect(screen.getByTestId("nomination-modal-submit")).toBeDisabled();
    expect(screen.getByTestId("nomination-pending-upvote")).toBeInTheDocument();
  });

  it("upvotes the existing proposal instead of posting a duplicate", async () => {
    const fetchSpy = mockFetch(true, 200, { pending: 1, pendingId: "nom-123" });
    const { user, onSuccess } = setup({ word: "απορ", direction: "add" });

    await waitFor(() =>
      expect(screen.getByTestId("nomination-pending-upvote")).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("nomination-pending-upvote"));

    await waitFor(() => expect(voteCall(fetchSpy)).toBeTruthy());
    expect(voteCall(fetchSpy)![0]).toBe("/api/nominations/nom-123/vote");
    const body = JSON.parse((voteCall(fetchSpy)![1] as RequestInit).body as string);
    expect(body.voteType).toBe("up");

    expect(screen.getByTestId("nomination-modal-success")).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith("απορ");
    // No duplicate nomination inserted.
    expect(postCall(fetchSpy)).toBeFalsy();
  });

  it("pivots to the upvote flow when the POST answers 409 already_pending", async () => {
    // The DB's pending-uniqueness backstop fired: the lookup saw nothing, but an
    // identical proposal landed before our POST. The modal must surface the
    // pending banner with the server-returned id, not the generic error state.
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/nominations/lookup")) {
        return {
          ok: true, status: 200,
          json: async () => ({ blocked: false, rejected: 0, accepted: 0, pending: 0, pendingId: null }),
        } as Response;
      }
      return {
        ok: false, status: 409,
        json: async () => ({ error: "already_pending", pendingId: "nom-42" }),
      } as Response;
    });
    const { user } = setup({ word: "απορ", direction: "add" });

    await fillRequired(user);
    await user.click(screen.getByTestId("nomination-modal-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("nomination-pending-upvote")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("nomination-modal-error")).toBeNull();

    // The offered upvote targets the id the 409 carried.
    await user.click(screen.getByTestId("nomination-pending-upvote"));
    await waitFor(() => expect(voteCall(fetchSpy as ReturnType<typeof mockFetch>)).toBeTruthy());
    expect(voteCall(fetchSpy as ReturnType<typeof mockFetch>)![0]).toBe("/api/nominations/nom-42/vote");
  });

  it("does not let a typed-but-unblurred duplicate slip through on submit", async () => {
    const fetchSpy = mockFetch(true, 200, { pending: 1, pendingId: "nom-7" });
    const { user } = setup({ wordEditable: true, direction: "add" });

    await user.type(screen.getByTestId("nomination-modal-word-input"), "απορ");
    await user.click(screen.getByTestId("nomination-modal-submit"));

    // The submit-time lookup catches the pending duplicate → no POST, upvote offered.
    await waitFor(() =>
      expect(screen.getByTestId("nomination-pending-upvote")).toBeInTheDocument(),
    );
    expect(postCall(fetchSpy)).toBeFalsy();
    expect(screen.getByTestId("nomination-modal-submit")).toBeDisabled();
  });

  it("shows an already-approved banner and blocks submit for an accepted-but-unreleased word", async () => {
    const fetchSpy = mockFetch(true, 200, { accepted: 1 });
    setup({ word: "εγκριθηκε", direction: "add" });

    await waitFor(() =>
      expect(screen.getByTestId("nomination-accepted-info")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("nomination-rejected-warning")).toBeNull();
    expect(screen.queryByTestId("nomination-pending-info")).toBeNull();
    expect(screen.getByTestId("nomination-modal-submit")).toBeDisabled();
    expect(postCall(fetchSpy)).toBeFalsy();
  });

  it("blocks a name/proper-noun word: shows banner, disables submit, never posts", async () => {
    const fetchSpy = mockFetch(true, 200, { blocked: true });
    setup({ word: "μαρια", direction: "add" });

    await waitFor(() =>
      expect(screen.getByTestId("nomination-blocked-warning")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("nomination-modal-submit")).toBeDisabled();
    expect(screen.queryByTestId("nomination-rejected-warning")).toBeNull();
    expect(screen.queryByTestId("nomination-pending-info")).toBeNull();
    expect(postCall(fetchSpy)).toBeFalsy();
  });

  it("does not let a typed-but-unblurred blocked word slip through on submit", async () => {
    const fetchSpy = mockFetch(true, 200, { blocked: true });
    const { user } = setup({ wordEditable: true, direction: "add" });

    await user.type(screen.getByTestId("nomination-modal-word-input"), "μαρια");
    await user.click(screen.getByTestId("nomination-modal-submit"));

    // The submit-time lookup catches the block → no POST, banner shown.
    await waitFor(() =>
      expect(screen.getByTestId("nomination-blocked-warning")).toBeInTheDocument(),
    );
    expect(postCall(fetchSpy)).toBeFalsy();
    expect(screen.getByTestId("nomination-modal-submit")).toBeDisabled();
  });

  it("shows no warning for a word with no prior nominations", async () => {
    mockFetch(true, 200, { rejected: 0, pending: 0 });
    setup({ word: "καινουργια", direction: "add" });

    await waitFor(() =>
      expect(screen.getByTestId("nomination-modal-submit")).not.toBeDisabled(),
    );
    expect(screen.queryByTestId("nomination-rejected-warning")).toBeNull();
    expect(screen.queryByTestId("nomination-pending-info")).toBeNull();
  });
});
