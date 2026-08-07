// useProfileStats — the Profile Page's ONE read of GET /api/profile/stats.
//
// The reason this hook exists is the fetch count: the lifetime strip and the Trophy
// Case both ladder on this response and each used to fetch it, so opening /profile
// fired two identical round-trips. The "one request feeds both panels" test below is
// the guard on that, not a nicety.

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useProfileStats } from "@/hooks/useProfileStats";

afterEach(() => vi.restoreAllMocks());

function mockStats(body: unknown, ok = true) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

/** Renders the hook's result as text so the assertions stay plain DOM reads. */
function Probe({ deviceId }: { deviceId: string }) {
  const { stats, errored } = useProfileStats(deviceId);
  return (
    <span data-testid="probe">
      {stats ? String(stats.total_points) : errored ? "errored" : "loading"}
    </span>
  );
}

const probe = () => screen.getByTestId("probe").textContent;

describe("useProfileStats", () => {
  it("returns the parsed stats for the device", async () => {
    mockStats({ total_points: 150, puzzles_played: 5 });
    render(<Probe deviceId="dev-A" />);

    await waitFor(() => expect(probe()).toBe("150"));
  });

  it("passes the device id through the query string, encoded", async () => {
    const spy = mockStats({ total_points: 1 });
    render(<Probe deviceId="dev A/1" />);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(String(spy.mock.calls[0]![0])).toBe("/api/profile/stats?device_uuid=dev%20A%2F1");
  });

  it("reports errored (not loading) when the response is not ok", async () => {
    mockStats({}, false);
    render(<Probe deviceId="dev-A" />);

    await waitFor(() => expect(probe()).toBe("errored"));
  });

  it("reports errored when the request throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<Probe deviceId="dev-A" />);

    await waitFor(() => expect(probe()).toBe("errored"));
  });

  it("does not fetch without a device id, and stays in the loading state", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    render(<Probe deviceId="" />);

    expect(spy).not.toHaveBeenCalled();
    expect(probe()).toBe("loading");
  });

  it("serves both panels from ONE request when the page reads it once", async () => {
    const spy = mockStats({ total_points: 42 });
    function Page() {
      const { stats } = useProfileStats("dev-A");
      return (
        <>
          <span data-testid="a">{stats?.total_points ?? "—"}</span>
          <span data-testid="b">{stats?.total_points ?? "—"}</span>
        </>
      );
    }
    render(<Page />);

    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("42"));
    expect(screen.getByTestId("b")).toHaveTextContent("42");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
