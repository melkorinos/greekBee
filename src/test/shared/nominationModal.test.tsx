// nominationModal.test.tsx — tests for the shared NominationModal component.
// Covers open/close, form fields, successful POST, success state, error state.

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { NominationModal } from "@/components/shared/NominationModal";
import userEvent from "@testing-library/user-event";

// ── fetch mock ────────────────────────────────────────────────────────────────

// Routes the new /api/nominations/lookup call separately from the POST so a
// single mock can drive both the re-proposal warning and the submission result.
function mockFetch(
  ok: boolean,
  status = ok ? 200 : 500,
  lookup: { rejected?: number; pending?: number } = {},
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/nominations/lookup")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ rejected: lookup.rejected ?? 0, pending: lookup.pending ?? 0 }),
      } as Response;
    }
    return { ok, status, json: async () => ({ ok }) } as Response;
  });
}

// Finds the POST /api/nominations call (ignores the lookup GET).
function postCall(fetchSpy: ReturnType<typeof mockFetch>) {
  return fetchSpy.mock.calls.find(
    ([url, init]) => url === "/api/nominations" && (init as RequestInit | undefined)?.method === "POST",
  );
}

afterEach(() => vi.restoreAllMocks());

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
    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() => expect(postCall(fetchSpy)).toBeTruthy());
    const body = JSON.parse((postCall(fetchSpy)![1] as RequestInit).body as string);
    expect(body.word).toBe("νεολογισμος");
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
    expect(body.word).toBe("καλος");
    expect(body.direction).toBe("add");
    expect(body.playerName).toBe("Νίκος");
    expect(body.note).toBe("σημαίνει καλός");
    expect(typeof body.deviceId).toBe("string");
    expect(body.deviceId.length).toBeGreaterThan(0);
  });

  it("shows success state after a successful POST", async () => {
    mockFetch(true);
    const { user } = setup();
    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("nomination-modal-success")).toBeInTheDocument(),
    );
  });

  it("calls onSuccess with the word after a successful POST", async () => {
    mockFetch(true);
    const { user, onSuccess } = setup();
    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("καλος"));
  });

  it("shows error message when POST fails", async () => {
    mockFetch(false);
    const { user } = setup();
    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("nomination-modal-error")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("nomination-modal-success")).toBeNull();
  });

  it("does NOT call onSuccess when POST fails", async () => {
    mockFetch(false);
    const { user, onSuccess } = setup();
    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("nomination-modal-error")).toBeInTheDocument(),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

// ── Re-proposal warning ─────────────────────────────────────────────────────

describe("NominationModal — re-proposal warning", () => {
  it("warns and disables submit when a previously-rejected word has no note", async () => {
    mockFetch(true, 200, { rejected: 2 });
    setup({ word: "απορ", direction: "add" });

    await waitFor(() =>
      expect(screen.getByTestId("nomination-rejected-warning")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("nomination-modal-submit")).toBeDisabled();
  });

  it("allows submit once an explanation is provided for a rejected word", async () => {
    const fetchSpy = mockFetch(true, 200, { rejected: 1 });
    const { user } = setup({ word: "απορ", direction: "add" });

    await waitFor(() =>
      expect(screen.getByTestId("nomination-rejected-warning")).toBeInTheDocument(),
    );
    await user.type(screen.getByTestId("nomination-modal-note"), "είναι υπαρκτή λέξη, δες λεξικό");
    await user.click(screen.getByTestId("nomination-modal-submit"));

    await waitFor(() => expect(postCall(fetchSpy)).toBeTruthy());
    const body = JSON.parse((postCall(fetchSpy)![1] as RequestInit).body as string);
    expect(body.word).toBe("απορ");
    expect(body.note).toBe("είναι υπαρκτή λέξη, δες λεξικό");
  });

  it("shows a gentle info banner (not a block) for an already-pending word", async () => {
    const fetchSpy = mockFetch(true, 200, { pending: 1 });
    const { user } = setup({ word: "απορ", direction: "add" });

    await waitFor(() =>
      expect(screen.getByTestId("nomination-pending-info")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("nomination-rejected-warning")).toBeNull();
    expect(screen.getByTestId("nomination-modal-submit")).not.toBeDisabled();

    await user.click(screen.getByTestId("nomination-modal-submit"));
    await waitFor(() => expect(postCall(fetchSpy)).toBeTruthy());
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
