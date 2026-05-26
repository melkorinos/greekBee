"use client";

// ProfileSection — cross-device profile state machine for the Leksokipos leaderboard.
//
// Modes: idle → creating → pin-reveal
//        idle → restoring → picker (2+ matches)
//        any  → linked (profile active)
//
// All async operations (API calls) live here. The parent modal stays presentational.

import { btnPrimaryCompact, inputCompactClass, labelClass } from "./styles";
import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileMatch {
  device_uuid:  string;
  display_name: string;
  created_at:   string;
  last_active:  string;
}

type ProfileMode =
  | "idle"        // not linked — shows create + restore entry points
  | "creating"    // name input + Δημιουργία
  | "pin-reveal"  // shows generated PIN; user must note it down
  | "restoring"   // name + PIN inputs + Επαναφορά
  | "picker"      // 2+ matches — user picks one
  | "linked";     // profile active — shows name + Αποσύνδεση

export interface ProfileSectionProps {
  profileLinked:    boolean;
  profilePin:       string;
  displayName:      string;
  onProfileCreate:  (name: string, pin: string) => Promise<{ pin: string }>;
  onProfileLinked:  () => void;
  onProfileRestore: (name: string, pin: string) => Promise<ProfileMatch[]>;
  onProfileSelect:  (deviceUuid: string, displayName: string) => Promise<void>;
  onDisconnect:     () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPickerDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return iso.slice(0, 10);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileSection({
  profileLinked,
  profilePin,
  displayName,
  onProfileCreate,
  onProfileLinked,
  onProfileRestore,
  onProfileSelect,
  onDisconnect,
}: ProfileSectionProps) {
  const [profileMode,          setProfileMode]          = useState<ProfileMode>(profileLinked ? "linked" : "idle");
  const [profileNameInput,     setProfileNameInput]     = useState("");
  const [profilePinInput,      setProfilePinInput]      = useState("");
  const [revealedPin,          setRevealedPin]          = useState("");
  const [profileError,         setProfileError]         = useState<string | null>(null);
  const [profileMatches,       setProfileMatches]       = useState<ProfileMatch[]>([]);
  const [profileLoading,       setProfileLoading]       = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  async function handleCreateSubmit() {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { pin } = await onProfileCreate(profileNameInput.trim(), profilePinInput.trim());
      setRevealedPin(pin);
      setProfileMode("pin-reveal");
    } catch {
      setProfileError("Παρουσιάστηκε σφάλμα. Δοκίμασε ξανά.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleRestoreSubmit() {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const matches = await onProfileRestore(profileNameInput.trim(), profilePinInput.trim());
      if (matches.length === 0) {
        setProfileError("Δεν βρέθηκε προφίλ με αυτό το όνομα και PIN.");
        setProfileLoading(false);
        return;
      }
      if (matches.length === 1) {
        await handlePickerSelect(matches[0]!);
        return;
      }
      setProfileMatches(matches);
      setProfileMode("picker");
      setProfileLoading(false);
    } catch {
      setProfileError("Παρουσιάστηκε σφάλμα. Δοκίμασε ξανά.");
      setProfileLoading(false);
    }
  }

  async function handlePickerSelect(match: ProfileMatch) {
    setProfileLoading(true);
    setProfileError(null);
    try {
      await onProfileSelect(match.device_uuid, match.display_name);
    } catch {
      setProfileError("Σφάλμα κατά την επαναφορά. Δοκίμασε ξανά.");
      setProfileLoading(false);
    }
  }

  function handleDisconnect() {
    onDisconnect();
    setProfileMode("idle");
    setProfileNameInput("");
    setProfilePinInput("");
    setProfileError(null);
    setConfirmingDisconnect(false);
  }

  function cancelProfile() {
    setProfileMode("idle");
    setProfileNameInput("");
    setProfilePinInput("");
    setProfileError(null);
  }

  return (
    <div className="px-5 py-3">
      <p className={`${labelClass} mb-1.5`}>Συγχρονισμός συσκευών</p>

      {profileMode === "idle" && !confirmingDisconnect && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setProfileMode("creating")}
            className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800 transition-colors"
          >
            Δημιουργία προφίλ
          </button>
          <span className="text-stone-300 select-none">|</span>
          <button
            onClick={() => setProfileMode("restoring")}
            className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800 transition-colors"
          >
            Σύνδεση
          </button>
          <span className="text-stone-300 select-none">|</span>
          <button
            onClick={() => setConfirmingDisconnect(true)}
            className="text-xs text-stone-400 hover:text-red-500 transition-colors"
          >
            Αποσύνδεση
          </button>
        </div>
      )}

      {profileMode === "creating" && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Όνομα (προαιρετικό)"
            value={profileNameInput}
            onChange={(e) => setProfileNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !profileLoading && void handleCreateSubmit()}
            maxLength={30}
            className={`w-full ${inputCompactClass}`}
            autoFocus
          />
          <input
            type="text"
            placeholder="PIN 4 ψηφίων (προαιρετικό)"
            value={profilePinInput}
            onChange={(e) => setProfilePinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => e.key === "Enter" && !profileLoading && void handleCreateSubmit()}
            inputMode="numeric"
            maxLength={4}
            className={`w-full ${inputCompactClass}`}
          />
          {profileError && <p className="text-xs text-red-500">{profileError}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={cancelProfile}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Άκυρο
            </button>
            <button
              onClick={() => void handleCreateSubmit()}
              disabled={profileLoading || (profilePinInput.length > 0 && profilePinInput.length < 4)}
              className={btnPrimaryCompact}
            >
              {profileLoading ? "…" : "Δημιουργία"}
            </button>
          </div>
        </div>
      )}

      {profileMode === "pin-reveal" && (
        <div className="space-y-2 text-center">
          <p className="text-xs text-stone-500">Ο κωδικός σου είναι:</p>
          <p className="text-3xl font-mono font-bold tracking-widest text-stone-900 bg-stone-50 border border-stone-200 rounded-xl py-2 px-4">
            {revealedPin}
          </p>
          <p className="text-xs text-stone-500">Φαίνεται πάντα στον Πίνακα Σκορ.</p>
          <button
            onClick={() => { onProfileLinked(); setProfileMode("linked"); }}
            className={btnPrimaryCompact}
          >
            Το κράτησα ✓
          </button>
        </div>
      )}

      {profileMode === "restoring" && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Όνομα"
            value={profileNameInput}
            onChange={(e) => setProfileNameInput(e.target.value)}
            maxLength={30}
            className={`w-full ${inputCompactClass}`}
            autoFocus
          />
          <input
            type="text"
            placeholder="PIN (4 ψηφία)"
            value={profilePinInput}
            onChange={(e) => setProfilePinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) =>
              e.key === "Enter" && !profileLoading && profilePinInput.length === 4 && void handleRestoreSubmit()
            }
            inputMode="numeric"
            maxLength={4}
            className={`w-full ${inputCompactClass}`}
          />
          {profileError && <p className="text-xs text-red-500">{profileError}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={cancelProfile}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Άκυρο
            </button>
            <button
              onClick={() => void handleRestoreSubmit()}
              disabled={profileLoading || !profileNameInput.trim() || profilePinInput.length !== 4}
              className={btnPrimaryCompact}
            >
              {profileLoading ? "…" : "Επαναφορά"}
            </button>
          </div>
        </div>
      )}

      {profileMode === "picker" && (
        <div className="space-y-1.5">
          <p className="text-xs text-stone-500 mb-1">
            Βρέθηκαν {profileMatches.length} παιχνίδια — ποιο είναι το δικό σου;
          </p>
          {profileError && <p className="text-xs text-red-500">{profileError}</p>}
          {profileMatches.map((m) => (
            <button
              key={m.device_uuid}
              onClick={() => void handlePickerSelect(m)}
              disabled={profileLoading}
              className="w-full text-left text-xs px-3 py-2 rounded-lg bg-stone-50 hover:bg-stone-100 active:bg-stone-200 disabled:opacity-50 transition-colors flex justify-between items-center"
            >
              <span className="font-medium text-stone-700">{m.display_name}</span>
              <span className="text-stone-400">Τελευταία: {formatPickerDate(m.last_active)}</span>
            </button>
          ))}
          <button
            onClick={() => { setProfileMode("restoring"); setProfileError(null); }}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors mt-1"
          >
            ← Πίσω
          </button>
        </div>
      )}

      {profileMode === "linked" && !confirmingDisconnect && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-600 font-semibold">
              ✓ {displayName || "Ανώνυμος"}
            </span>
            <button
              onClick={() => setConfirmingDisconnect(true)}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors"
            >
              Αποσύνδεση
            </button>
          </div>
          {profilePin && (
            <p className="text-xs text-stone-400">
              PIN:{" "}
              <span className="font-mono font-bold tracking-widest text-stone-600">
                {profilePin}
              </span>
            </p>
          )}
        </div>
      )}

      {confirmingDisconnect && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Αποσύνδεση;</span>
          <button
            data-testid="btn-disconnect-confirm"
            onClick={handleDisconnect}
            className="text-xs font-semibold text-red-600 border border-red-300 rounded-full px-3 py-1 hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            Ναι
          </button>
          <button
            data-testid="btn-disconnect-cancel"
            onClick={() => setConfirmingDisconnect(false)}
            className="text-xs text-stone-500 border border-stone-200 rounded-full px-3 py-1 hover:bg-stone-100 transition-colors"
          >
            Άκυρο
          </button>
        </div>
      )}
    </div>
  );
}
