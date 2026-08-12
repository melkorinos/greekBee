// feedbackModal.test.tsx — tests for the shared FeedbackModal component.
// Covers visibility, required-text guard, FormSubmit POST payload (message +
// metadata), success + error states, and the client-side throttle.
// Mirrors nominationModal.test.tsx.

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { FeedbackModal } from "@/components/shared/FeedbackModal";
import userEvent from "@testing-library/user-event";

// ── fetch mock ────────────────────────────────────────────────────────────────

function mockFetch(ok: boolean, status = ok ? 200 : 500) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    return { ok, status, json: async () => ({ success: String(ok) }) } as Response;
  });
}

function postCall(fetchSpy: ReturnType<typeof mockFetch>) {
  return fetchSpy.mock.calls.find(([url]) =>
    typeof url === "string" && url.includes("formsubmit.co/ajax/"),
  );
}

function postBody(fetchSpy: ReturnType<typeof mockFetch>): FormData {
  return (postCall(fetchSpy)![1] as RequestInit).body as FormData;
}

afterEach(() => vi.restoreAllMocks());

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup(overrides: Partial<Parameters<typeof FeedbackModal>[0]> = {}) {
  const onClose = vi.fn();
  const user    = userEvent.setup();
  render(<FeedbackModal isOpen={true} onClose={onClose} {...overrides} />);
  return { user, onClose };
}

// ── Visibility ─────────────────────────────────────────────────────────────────

describe("FeedbackModal — visibility", () => {
  it("renders nothing when isOpen is false", () => {
    render(<FeedbackModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("feedback-modal")).toBeNull();
  });

  it("renders the modal when isOpen is true", () => {
    setup();
    expect(screen.getByTestId("feedback-modal")).toBeInTheDocument();
  });
});

// ── Required-text guard ─────────────────────────────────────────────────────────

describe("FeedbackModal — required text", () => {
  it("disables submit while the message is empty", () => {
    setup();
    expect(screen.getByTestId("feedback-modal-submit")).toBeDisabled();
  });

  it("enables submit once a message is typed", async () => {
    const { user } = setup();
    await user.type(screen.getByTestId("feedback-modal-message"), "κάτι δεν παίζει");
    expect(screen.getByTestId("feedback-modal-submit")).not.toBeDisabled();
  });
});

// ── Submission ────────────────────────────────────────────────────────────────

describe("FeedbackModal — submission", () => {
  it("POSTs to FormSubmit with the message and the device id", async () => {
    const fetchSpy = mockFetch(true);
    const { user } = setup();

    await user.type(screen.getByTestId("feedback-modal-message"), "το κουμπί δεν δουλεύει");
    await user.click(screen.getByTestId("feedback-modal-submit"));

    await waitFor(() => expect(postCall(fetchSpy)).toBeTruthy());
    const [url, init] = postCall(fetchSpy)! as [string, RequestInit];
    expect(url).toContain("formsubmit.co/ajax/");
    expect(init.method).toBe("POST");

    const body = postBody(fetchSpy);
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("message")).toBe("το κουμπί δεν δουλεύει");
    // device_id earns its place: a deletion request sent from this form arrives
    // already carrying the key the operator needs to action it (/privacy).
    expect(typeof body.get("device_id")).toBe("string");
  });

  // TICKET-07. FormSubmit is the Platform's one third-party processor and
  // /privacy states by name that exactly two things leave the browser. This is
  // the guard on that sentence: a well-meaning "let's send the user agent for
  // debugging" would make a published privacy claim false, and nothing else in
  // the suite would notice.
  it("sends NOTHING beyond the message, the device id and FormSubmit's own controls", async () => {
    const fetchSpy = mockFetch(true);
    const { user } = setup();

    await user.type(screen.getByTestId("feedback-modal-message"), "δοκιμή");
    await user.click(screen.getByTestId("feedback-modal-submit"));
    await waitFor(() => expect(postCall(fetchSpy)).toBeTruthy());

    const body = postBody(fetchSpy);
    expect(body.get("user_agent")).toBeNull();
    expect(body.get("page_url")).toBeNull();

    // `_`-prefixed keys are FormSubmit's own directives (subject, captcha), not
    // player data — they never reach anyone but the maintainer's inbox subject line.
    const playerFields = [...body.keys()].filter((k) => !k.startsWith("_")).sort();
    expect(playerFields).toEqual(["device_id", "message"]);
  });

  it("shows success state after a successful POST", async () => {
    mockFetch(true);
    const { user } = setup();
    await user.type(screen.getByTestId("feedback-modal-message"), "ωραίο παιχνίδι");
    await user.click(screen.getByTestId("feedback-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("feedback-modal-success")).toBeInTheDocument(),
    );
    expect(screen.getByText("Ευχαριστούμε!")).toBeInTheDocument();
  });

  it("shows an error message when the POST fails", async () => {
    mockFetch(false);
    const { user } = setup();
    await user.type(screen.getByTestId("feedback-modal-message"), "σφάλμα");
    await user.click(screen.getByTestId("feedback-modal-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("feedback-modal-error")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("feedback-modal-success")).toBeNull();
  });
});

// ── Throttle ────────────────────────────────────────────────────────────────────

describe("FeedbackModal — throttle", () => {
  it("blocks a submit when one was sent within the last minute", async () => {
    localStorage.setItem("feedback:lastSentAt", String(Date.now()));
    const fetchSpy = mockFetch(true);
    const { user } = setup();

    await user.type(screen.getByTestId("feedback-modal-message"), "πολύ γρήγορα ξανά");
    await user.click(screen.getByTestId("feedback-modal-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("feedback-modal-throttled")).toBeInTheDocument(),
    );
    expect(postCall(fetchSpy)).toBeFalsy();
    localStorage.removeItem("feedback:lastSentAt");
  });
});
