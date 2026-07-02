// useLeaderboardProfile.test.ts — the shared profile-aware save logic behind
// every game's leaderboard modal, plus the useLeaderboardProfileSlot bundle
// that all four game modals spread onto LeaderboardModalBase.
//
// Contract: unlinked → "Αποθήκευση" creates a profile (errors surface as
// createError); linked → it just saves the display name locally.

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfileSection } from "@/components/shared/ProfileSection";
import { useLeaderboardProfile } from "@/hooks/useLeaderboardProfile";
import { useLeaderboardProfileSlot } from "@/components/shared/LeaderboardProfileSlot";

// ── useLeaderboardProfile ─────────────────────────────────────────────────────

describe("useLeaderboardProfile — unlinked", () => {
  it("handleSave creates a profile instead of saving the name", async () => {
    const onProfileCreate = vi.fn().mockResolvedValue(undefined);
    const onSaveName = vi.fn();
    const { result } = renderHook(() =>
      useLeaderboardProfile({ profileLinked: false, onProfileCreate, onSaveName }),
    );

    await act(async () => { await result.current.handleSave("Άννα"); });

    expect(onProfileCreate).toHaveBeenCalledWith("Άννα");
    expect(onSaveName).not.toHaveBeenCalled();
    expect(result.current.createError).toBeNull();
  });

  it("a failed profile create surfaces a Greek createError message", async () => {
    const onProfileCreate = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() =>
      useLeaderboardProfile({ profileLinked: false, onProfileCreate, onSaveName: vi.fn() }),
    );

    await act(async () => { await result.current.handleSave("Άννα"); });

    expect(result.current.createError).toMatch(/σφάλμα/i);
  });

  it("createError clears again on the next successful save", async () => {
    const onProfileCreate = vi.fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() =>
      useLeaderboardProfile({ profileLinked: false, onProfileCreate, onSaveName: vi.fn() }),
    );

    await act(async () => { await result.current.handleSave("Άννα"); });
    expect(result.current.createError).not.toBeNull();

    await act(async () => { await result.current.handleSave("Άννα"); });
    expect(result.current.createError).toBeNull();
  });
});

describe("useLeaderboardProfile — linked", () => {
  it("handleSave saves the name and never calls onProfileCreate", async () => {
    const onProfileCreate = vi.fn();
    const onSaveName = vi.fn();
    const { result } = renderHook(() =>
      useLeaderboardProfile({ profileLinked: true, onProfileCreate, onSaveName }),
    );

    await act(async () => { await result.current.handleSave("Νίκος"); });

    expect(onSaveName).toHaveBeenCalledWith("Νίκος");
    expect(onProfileCreate).not.toHaveBeenCalled();
  });
});

// ── useLeaderboardProfileSlot ─────────────────────────────────────────────────

function slotProps(profileLinked: boolean) {
  return {
    profileLinked,
    displayName:        "Άννα",
    onSaveName:         vi.fn(),
    onProfileCreate:    vi.fn().mockResolvedValue(undefined),
    onTransferGenerate: vi.fn().mockResolvedValue("ABC123"),
    onTransferClaim:    vi.fn().mockResolvedValue(undefined),
    onDisconnect:       vi.fn(),
  };
}

describe("useLeaderboardProfileSlot", () => {
  it("always shows the name editor", () => {
    const { result } = renderHook(() => useLeaderboardProfileSlot(slotProps(false)));
    expect(result.current.showNameEditor).toBe(true);
  });

  it("save button is always-active only while unlinked", () => {
    const unlinked = renderHook(() => useLeaderboardProfileSlot(slotProps(false)));
    const linked   = renderHook(() => useLeaderboardProfileSlot(slotProps(true)));
    expect(unlinked.result.current.saveButtonAlwaysActive).toBe(true);
    expect(linked.result.current.saveButtonAlwaysActive).toBe(false);
  });

  it("topSlot is a ProfileSection wired with the profile state and name", () => {
    const props = slotProps(true);
    const { result } = renderHook(() => useLeaderboardProfileSlot(props));
    const topSlot = result.current.topSlot as React.ReactElement<
      { profileLinked: boolean; displayName: string }
    >;
    expect(topSlot.type).toBe(ProfileSection);
    expect(topSlot.props.profileLinked).toBe(true);
    expect(topSlot.props.displayName).toBe("Άννα");
  });

  it("onSaveName routes through handleSave — unlinked saves create a profile", async () => {
    const props = slotProps(false);
    const { result } = renderHook(() => useLeaderboardProfileSlot(props));

    act(() => { result.current.onSaveName?.("Άννα"); });

    await waitFor(() => expect(props.onProfileCreate).toHaveBeenCalledWith("Άννα"));
    expect(props.onSaveName).not.toHaveBeenCalled();
  });
});
