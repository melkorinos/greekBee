// suggestWordModal.test.tsx — tests for the SuggestWordModal component.
// Covers open/close, form fields, successful POST, success state, error state.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SuggestWordModal } from "@/components/spelling-bee/SuggestWordModal";

// ── fetch mock ────────────────────────────────────────────────────────────────

function mockFetch(ok: boolean) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    json: async () => ({ ok }),
  } as Response);
}

afterEach(() => vi.restoreAllMocks());

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup(overrides: Partial<Parameters<typeof SuggestWordModal>[0]> = {}) {
  const onClose   = vi.fn();
  const onSuccess = vi.fn();
  const user      = userEvent.setup();
  render(
    <SuggestWordModal
      word="καλος"
      isOpen={true}
      onClose={onClose}
      onSuccess={onSuccess}
      {...overrides}
    />,
  );
  return { user, onClose, onSuccess };
}

// ── Visibility ─────────────────────────────────────────────────────────────────

describe("SuggestWordModal — visibility", () => {
  it("renders nothing when isOpen is false", () => {
    render(
      <SuggestWordModal word="test" isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );
    expect(screen.queryByTestId("suggest-modal")).toBeNull();
  });

  it("renders the modal when isOpen is true", () => {
    setup();
    expect(screen.getByTestId("suggest-modal")).toBeInTheDocument();
  });
});

// ── Word field ─────────────────────────────────────────────────────────────────

describe("SuggestWordModal — word field", () => {
  it("shows the word uppercased in the readonly field", () => {
    setup();
    const wordInput = screen.getByTestId("suggest-modal-word") as HTMLInputElement;
    expect(wordInput.value).toBe("ΚΑΛΟΣ");
    expect(wordInput.readOnly).toBe(true);
  });
});

// ── Close ─────────────────────────────────────────────────────────────────────

describe("SuggestWordModal — close", () => {
  it("calls onClose when the ✕ button is clicked", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByTestId("suggest-modal-close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByTestId("suggest-modal-cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByTestId("suggest-modal-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ── Submission ────────────────────────────────────────────────────────────────

describe("SuggestWordModal — submission", () => {
  it("calls POST /api/suggest-word with word, name and note on submit", async () => {
    const fetchSpy = mockFetch(true);
    const { user } = setup();

    await user.type(screen.getByTestId("suggest-modal-name"), "Νίκος");
    await user.type(screen.getByTestId("suggest-modal-note"), "σημαίνει καλός");
    await user.click(screen.getByTestId("suggest-modal-submit"));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/suggest-word");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.word).toBe("καλος");
    expect(body.playerName).toBe("Νίκος");
    expect(body.note).toBe("σημαίνει καλός");
  });

  it("shows success state after a successful POST", async () => {
    mockFetch(true);
    const { user } = setup();
    await user.click(screen.getByTestId("suggest-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("suggest-modal-success")).toBeInTheDocument(),
    );
  });

  it("calls onSuccess after a successful POST", async () => {
    mockFetch(true);
    const { user, onSuccess } = setup();
    await user.click(screen.getByTestId("suggest-modal-submit"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });

  it("shows error message when POST fails", async () => {
    mockFetch(false);
    const { user } = setup();
    await user.click(screen.getByTestId("suggest-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("suggest-modal-error")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("suggest-modal-success")).toBeNull();
  });

  it("does NOT call onSuccess when POST fails", async () => {
    mockFetch(false);
    const { user, onSuccess } = setup();
    await user.click(screen.getByTestId("suggest-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("suggest-modal-error")).toBeInTheDocument(),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
