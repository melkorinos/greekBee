// useOfflineMode.test.tsx — Offline Mode: the platform-wide activate/deactivate state
// behind the drawer toggle (ADR 0010).
//
// Covers the four behaviours the handoff calls load-bearing:
//   1. the offline game set is DERIVED from the registry (a wip flip is enough)
//   2. activation prefetches those routes while the player still has a connection
//   3. beforeunload is registered only while active — a refresh offline is unrecoverable
//   4. a pending outbox is flushed on deactivate AND on mount (the "forgot to
//      deactivate" safety net), with a failed post keeping its entry

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";

import { OFFLINE_GAME_IDS, OfflineModeProvider, useOfflineMode } from "@/hooks/useOfflineMode";
import { readOutbox, writeOutboxEntry } from "@/lib/offlineOutbox";

// ── Mocks ───────────────────────────────────────────────────────────────────

// IMPORTANT: the App Router's prefetch is `(href, options?) => void` — it returns
// NOTHING, not a promise. Mocking it as promise-returning is what let the original
// implementation ship a no-op: `Promise.allSettled` over six `undefined`s resolves
// instantly, so the toggle reported "ready" before a single byte was fetched and a
// player who went offline on that cue found nothing cached. The mock is deliberately
// void-returning so the test cannot re-acquire that blind spot.
const prefetch = vi.fn<(href: string, options?: unknown) => void>(() => undefined);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch }),
}));


const postScoreAwaitable = vi.fn();
vi.mock("@/lib/postScore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/postScore")>()),
  postScoreAwaitable: (url: string, body: unknown) => postScoreAwaitable(url, body),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return <OfflineModeProvider>{children}</OfflineModeProvider>;
}

const renderOfflineMode = () => renderHook(() => useOfflineMode(), { wrapper });

const ENTRY = {
  gameId:      "leksokipos",
  puzzleDate:  "2026-08-03",
  deviceId:    "device-1",
  score:       42,
  displayName: "Μαρία",
};

beforeEach(() => {
  prefetch.mockClear();
  prefetch.mockImplementation(() => undefined);
  postScoreAwaitable.mockReset();
  postScoreAwaitable.mockResolvedValue(true);
});

afterEach(() => {
  // Only spies created per-test are undone. A blanket restoreAllMocks() would also
  // tear down the module-level next/navigation mock, leaving useRouter() undefined
  // so the provider threw during render and every result.current came back null.
  vi.restoreAllMocks();
  prefetch.mockReset();
  prefetch.mockImplementation(() => undefined);
});

// ── The offline game set ────────────────────────────────────────────────────

describe("OFFLINE_GAME_IDS", () => {
  it("excludes the wip and hidden games — all three are out of scope for launch", () => {
    // Since TICKET-06 all three are BOTH wip and hidden, so this passes on either
    // flag alone. The `hidden`-only case (a finished Game that is not shown) has no
    // real row to exercise it and is probe-tested in registryCoverage.test.tsx.
    expect(OFFLINE_GAME_IDS).not.toContain("posokanei");
    expect(OFFLINE_GAME_IDS).not.toContain("logopaignio");
    expect(OFFLINE_GAME_IDS).not.toContain("leksindeseis");
  });

  it("excludes the server-backed community surfaces, which cannot work offline", () => {
    // Both fetch their content from Supabase per view, so prefetching the route
    // yields an empty shell rather than a playable round.
    expect(OFFLINE_GAME_IDS).not.toContain("leksikastirio");
    expect(OFFLINE_GAME_IDS).not.toContain("stavrolekso");
  });

  it("includes the self-contained finished games", () => {
    expect(OFFLINE_GAME_IDS).toEqual(
      expect.arrayContaining([
        "leksokipos",
        "leksiarxeio",
        "vrestifrasi",
        "leksodromia",
        "leksoplegma",
        "topothesies",
      ]),
    );
  });
});

// ── Activation ──────────────────────────────────────────────────────────────

describe("useOfflineMode — activation", () => {
  it("starts inactive", () => {
    const { result } = renderOfflineMode();
    expect(result.current.active).toBe(false);
  });

  it("becomes active after activate() resolves", async () => {
    const { result } = renderOfflineMode();
    await act(async () => { await result.current.activate(); });
    expect(result.current.active).toBe(true);
  });

  it("prefetches every offline game route on activation", async () => {
    const { result } = renderOfflineMode();
    await act(async () => { await result.current.activate(); });

    const prefetched = prefetch.mock.calls.map(([href]) => href);
    expect(prefetched).toEqual(expect.arrayContaining(["/leksokipos", "/leksiarxeio"]));
    expect(prefetch).toHaveBeenCalledTimes(OFFLINE_GAME_IDS.length);
  });

  it("does not treat prefetch as awaitable — it returns void", async () => {
    // Regression (2026-08-03): activation used `await Promise.allSettled(hrefs.map(
    // async (h) => router.prefetch(h)))`. Since prefetch returns undefined, that
    // resolved immediately and `preparing` flipped false before anything was cached,
    // so the UI told the player "ready" and they cut the network on a false cue.
    // Any future readiness signal must come from something that actually resolves.
    const { result } = renderOfflineMode();
    await act(async () => { await result.current.activate(); });

    for (const returned of prefetch.mock.results) {
      expect(returned.value).toBeUndefined();
    }
  });

  it("still activates when prefetch throws — prefetch is best-effort", async () => {
    prefetch.mockImplementation(() => { throw new Error("offline already"); });
    const { result } = renderOfflineMode();
    await act(async () => { await result.current.activate(); });
    expect(result.current.active).toBe(true);
  });
});

// ── beforeunload ────────────────────────────────────────────────────────────

describe("useOfflineMode — refresh guard", () => {
  it("does not register beforeunload while inactive", () => {
    const add = vi.spyOn(window, "addEventListener");
    renderOfflineMode();
    expect(add).not.toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("registers beforeunload once active", async () => {
    const add = vi.spyOn(window, "addEventListener");
    const { result } = renderOfflineMode();
    await act(async () => { await result.current.activate(); });
    expect(add).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("cancels the unload event so the browser shows its confirmation dialog", async () => {
    const { result } = renderOfflineMode();
    await act(async () => { await result.current.activate(); });

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("removes the beforeunload guard on deactivate", async () => {
    const { result } = renderOfflineMode();
    await act(async () => { await result.current.activate(); });
    await act(async () => { await result.current.deactivate(); });

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});

// ── Flush ───────────────────────────────────────────────────────────────────

describe("useOfflineMode — flush", () => {
  it("flushes the outbox on deactivate", async () => {
    const { result } = renderOfflineMode();
    await act(async () => { await result.current.activate(); });
    writeOutboxEntry(ENTRY);

    await act(async () => { await result.current.deactivate(); });

    expect(postScoreAwaitable).toHaveBeenCalledTimes(1);
    expect(readOutbox()).toEqual([]);
    expect(result.current.active).toBe(false);
  });

  it("keeps a pending entry whose post failed and stays deactivated", async () => {
    postScoreAwaitable.mockResolvedValue(false);
    const { result } = renderOfflineMode();
    await act(async () => { await result.current.activate(); });
    writeOutboxEntry(ENTRY);

    await act(async () => { await result.current.deactivate(); });

    expect(readOutbox()).toEqual([ENTRY]);
    expect(result.current.active).toBe(false);
  });

  it("flushes a pending entry on mount even when offline mode was never activated", async () => {
    writeOutboxEntry(ENTRY);

    renderOfflineMode();

    await waitFor(() => expect(postScoreAwaitable).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(readOutbox()).toEqual([]));
  });

  it("posts nothing on mount when the outbox is empty", async () => {
    renderOfflineMode();
    await act(async () => { await Promise.resolve(); });
    expect(postScoreAwaitable).not.toHaveBeenCalled();
  });
});

// ── Context wiring ──────────────────────────────────────────────────────────

describe("OfflineModeProvider", () => {
  it("shares one state between separate consumers", async () => {
    function Toggle() {
      const { active, activate } = useOfflineMode();
      return <button onClick={() => void activate()}>{active ? "on" : "off"}</button>;
    }
    function Readout() {
      const { active } = useOfflineMode();
      return <p>readout:{active ? "on" : "off"}</p>;
    }

    render(
      <OfflineModeProvider>
        <Toggle />
        <Readout />
      </OfflineModeProvider>,
    );

    await act(async () => { screen.getByRole("button").click(); });

    expect(screen.getByText("readout:on")).toBeInTheDocument();
  });

  it("reports inactive outside a provider rather than throwing", () => {
    // Leksokipos' useDayChange consults this on pages that may render in tests or
    // in isolation; a throw there would break an unrelated game.
    const { result } = renderHook(() => useOfflineMode());
    expect(result.current.active).toBe(false);
  });
});
