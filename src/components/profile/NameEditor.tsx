"use client";

// NameEditor — the display-name (nickname) editor on /profile.
//
// The name shown on the leaderboard is the nickname edited here, not the Google
// account name (which /profile shows separately when AuthLinked). Saving persists
// via POST /api/profile, which also fans the name out to the player's existing
// game_scores rows (the leaderboard reads names off those rows). For an unlinked
// device, naming yourself here creates the profile — same as naming yourself in-game.

import { btnPrimaryCompact, inputCompactClass, labelClass } from "@/styles/recipes";
import { useEffect, useState } from "react";

export interface NameEditorProps {
  displayName: string;
  /** Persists the name (POST /api/profile + local store). Rejects on failure. */
  onSave: (name: string) => Promise<void>;
}

export function NameEditor({ displayName, onSave }: NameEditorProps) {
  const [nameInput, setNameInput] = useState(displayName);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => { setNameInput(displayName); }, [displayName]);

  const trimmed = nameInput.trim();
  const dirty   = trimmed !== displayName && trimmed !== "";

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Παρουσιάστηκε σφάλμα. Δοκίμασε ξανά.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-5 py-4">
      <label htmlFor="profile-name" className={`${labelClass} mb-1.5`}>Το όνομά σου</label>
      <p className="text-xs text-muted mb-2">Εμφανίζεται στον πίνακα κατάταξης.</p>
      <div className="flex gap-2">
        <input
          id="profile-name"
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSave()}
          placeholder="Ανώνυμος"
          maxLength={30}
          className={`flex-1 min-w-0 ${inputCompactClass}`}
        />
        <button
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className={btnPrimaryCompact}
        >
          {saving ? "…" : saved ? "✓" : "Αποθήκευση"}
        </button>
      </div>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
