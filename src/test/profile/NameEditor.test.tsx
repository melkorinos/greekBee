// NameEditor.test.tsx — the /profile display-name editor (ADR 0012 follow-up).
//
// Guards the concern that motivated it: a player (including a Google-authed one)
// must be able to rename themselves on the profile page, and the save must reach
// the persistence handler with the trimmed value.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NameEditor } from "@/components/profile/NameEditor";

describe("NameEditor", () => {
  it("prefills the input with the current display name", () => {
    render(<NameEditor displayName="Άννα" onSave={vi.fn().mockResolvedValue(undefined)} />);
    expect((screen.getByLabelText("Το όνομά σου") as HTMLInputElement).value).toBe("Άννα");
  });

  it("disables Save until the name changes", () => {
    render(<NameEditor displayName="Άννα" onSave={vi.fn().mockResolvedValue(undefined)} />);
    expect((screen.getByText("Αποθήκευση") as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves the trimmed new name", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<NameEditor displayName="Άννα" onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Το όνομά σου"), { target: { value: "  Βάσος  " } });
    fireEvent.click(screen.getByText("Αποθήκευση"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("Βάσος"));
  });

  it("surfaces an error when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("boom"));
    render(<NameEditor displayName="Άννα" onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Το όνομά σου"), { target: { value: "Βάσος" } });
    fireEvent.click(screen.getByText("Αποθήκευση"));
    await waitFor(() => expect(screen.getByText(/σφάλμα/i)).toBeTruthy());
  });
});
