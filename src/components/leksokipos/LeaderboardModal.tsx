"use client";

// LeaderboardModal — bottom-sheet leaderboard + cross-device profile section.
//
// Profile section sits between the header and the name editor.
// Mode state machine: idle → creating → pin-reveal
//                     idle → restoring → picker (2+ matches)
//                     any  → linked (profile active)
// All async operations (API calls, state hot-swap) live in GameBoard —
// this component stays presentational and receives them as callbacks.

import { btnPrimaryCompact, inputCompactClass, labelClass, lbRowBase, lbRowPlayer, lbTdName, lbTdRank, lbTdScore } from "./styles";
import { useEffect, useState } from "react";

import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";

// ── Day-label helpers ─────────────────────────────────────────────────────────

const GREEK_DAYS = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"] as const;

function formatPickerDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return iso.slice(0, 10);
  }
}

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

interface LeaderboardModalProps {
  isOpen:           boolean;
  defaultPuzzleId:  string;
  recentDates:      string[];
  deviceId:         string;
  displayName:      string;
  profileLinked:    boolean;
  onSaveName:       (name: string) => void;
  onProfileCreate:  (name: string) => Promise<{ pin: string }>;
  onProfileRestore: (name: string, pin: string) => Promise<ProfileMatch[]>;
  onProfileSelect:  (deviceUuid: string, displayName: string) => Promise<void>;
  onDisconnect:     () => void;
  onClose:          () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LeaderboardModal({
  isOpen,
  defaultPuzzleId,
  recentDates,
  deviceId,
  displayName,
  profileLinked,
  onSaveName,
  onProfileCreate,
  onProfileRestore,
  onProfileSelect,
  onDisconnect,
  onClose,
}: LeaderboardModalProps) {

  // ── Leaderboard state ────────────────────────────────────────────────────────

  const [selectedDate, setSelectedDate] = useState(defaultPuzzleId);
  const [nameInput,    setNameInput]    = useState(displayName);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => { setNameInput(displayName); }, [displayName]);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(defaultPuzzleId);
      setProfileMode(profileLinked ? "linked" : "idle");
      setProfileNameInput("");
      setProfilePinInput("");
      setProfileError(null);
      setRevealedPin("");
      setProfileMatches([]);
      setProfileLoading(false);
    }
  }, [isOpen, defaultPuzzleId, profileLinked]);

  const { data, isLoading, error, refresh } = useLeaderboard(
    selectedDate,
    deviceId,
    isOpen
  );

  // ── Profile state ────────────────────────────────────────────────────────────

  const [profileMode,      setProfileMode]      = useState<ProfileMode>(profileLinked ? "linked" : "idle");
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profilePinInput,  setProfilePinInput]  = useState("");
  const [revealedPin,      setRevealedPin]      = useState("");
  const [profileError,     setProfileError]     = useState<string | null>(null);
  const [profileMatches,   setProfileMatches]   = useState<ProfileMatch[]>([]);
  const [profileLoading,   setProfileLoading]   = useState(false);

  // ── Profile handlers ─────────────────────────────────────────────────────────

  async function handleCreateSubmit() {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { pin } = await onProfileCreate(profileNameInput.trim());
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
      // onProfileSelect closes the modal via GameBoard
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
  }

  function cancelProfile() {
    setProfileMode("idle");
    setProfileNameInput("");
    setProfilePinInput("");
    setProfileError(null);
  }

  // ── Leaderboard handlers ─────────────────────────────────────────────────────

  function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    onSaveName(trimmed);
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const { top20, playerRow } = data;
  const nameDirty = nameInput.trim() !== displayName && nameInput.trim() !== "";
  const isViewingCurrentPuzzle = selectedDate === defaultPuzzleId;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Πίνακας Σκορ"
      onClick={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative bg-white rounded-t-2xl w-full max-w-sm max-h-[82vh] flex flex-col shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-100">
          <h2 className="text-base font-bold text-stone-800">🏆 Πίνακας Σκορ</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100"
            aria-label="Κλείσιμο"
          >
            ×
          </button>
        </div>

        {/* ── Profile section ─────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-stone-100">
          <p className={`${labelClass} mb-1.5`}>Συγχρονισμός συσκευών</p>

          {profileMode === "idle" && (
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
                Επαναφορά
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
                onKeyDown={(e) => e.key === "Enter" && !profileLoading && handleCreateSubmit()}
                maxLength={30}
                className={`w-full ${inputCompactClass}`}
                autoFocus
              />
              {profileError && (
                <p className="text-xs text-red-500">{profileError}</p>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={cancelProfile}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Άκυρο
                </button>
                <button
                  onClick={() => void handleCreateSubmit()}
                  disabled={profileLoading}
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
              <p className="text-xs text-amber-600 font-medium">
                Σημείωσέ τον — δεν αποθηκεύεται εδώ.
              </p>
              <button
                onClick={() => setProfileMode("linked")}
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
                onKeyDown={(e) => e.key === "Enter" && !profileLoading && profilePinInput.length === 4 && handleRestoreSubmit()}
                inputMode="numeric"
                maxLength={4}
                className={`w-full ${inputCompactClass}`}
              />
              {profileError && (
                <p className="text-xs text-red-500">{profileError}</p>
              )}
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
              {profileError && (
                <p className="text-xs text-red-500">{profileError}</p>
              )}
              {profileMatches.map((m) => (
                <button
                  key={m.device_uuid}
                  onClick={() => void handlePickerSelect(m)}
                  disabled={profileLoading}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-stone-50 hover:bg-stone-100 active:bg-stone-200 disabled:opacity-50 transition-colors flex justify-between items-center"
                >
                  <span className="font-medium text-stone-700">{m.display_name}</span>
                  <span className="text-stone-400">
                    Τελευταία: {formatPickerDate(m.last_active)}
                  </span>
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

          {profileMode === "linked" && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-600 font-semibold">
                ✓ {displayName || "Ανώνυμος"}
              </span>
              <button
                onClick={handleDisconnect}
                className="text-xs text-stone-400 hover:text-red-500 transition-colors"
              >
                Αποσύνδεση
              </button>
            </div>
          )}
        </div>

        {/* ── Display name — hidden when profile is active ─────────────────────── */}
        {!profileLinked && (
          <div className="px-5 py-3 border-b border-stone-100">
            <label className={`${labelClass} mb-1.5`}>
              Το όνομά σου
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && nameDirty && handleSaveName()}
                placeholder="Ανώνυμος"
                maxLength={30}
                className={`flex-1 ${inputCompactClass}`}
              />
              <button
                onClick={handleSaveName}
                disabled={!nameDirty}
                className={btnPrimaryCompact}
              >
                {!nameDirty && displayName ? "✓" : "Αποθήκευση"}
              </button>
            </div>
          </div>
        )}

        {/* ── Day strip ───────────────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-stone-100">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {recentDates.map((date) => {
              const isSelected = date === selectedDate;
              const isToday    = date === today;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  aria-pressed={isSelected}
                  aria-label={date}
                  className={`shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-lg transition-colors ${
                    isSelected
                      ? "bg-amber-400 text-amber-900"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  <span className="text-[0.6rem] font-semibold leading-tight">
                    {isToday ? "Σήμερα" : GREEK_DAYS[new Date(date + "T00:00:00").getDay()]}
                  </span>
                  <span className="text-sm font-bold leading-tight">
                    {new Date(date + "T00:00:00").getDate()}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => void refresh()}
            className="mt-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors"
            aria-label="Ανανέωση"
          >
            ↻ Ανανέωση
          </button>
        </div>

        {/* ── Leaderboard content ─────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-5 py-3">

          {isLoading && (
            <p className="text-center text-stone-400 text-sm py-10">Φόρτωση…</p>
          )}

          {!isLoading && error && (
            <p className="text-center text-red-400 text-sm py-10">{error}</p>
          )}

          {!isLoading && !error && top20.length === 0 && (
            <div className="text-center py-10">
              <p className="text-stone-400 text-sm mb-3">
                Κανείς δεν έχει παίξει αυτή την ημέρα ακόμα.
              </p>
              {!isViewingCurrentPuzzle && selectedDate <= today && (
                <Link
                  href={`/leksokipos?puzzle=${selectedDate}`}
                  className="text-stone-600 text-sm underline hover:text-stone-800"
                >
                  Παίξε αυτό το παζλ →
                </Link>
              )}
            </div>
          )}

          {!isLoading && !error && top20.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="text-stone-400 text-xs uppercase tracking-wide">
                  <th className="text-left pb-2 pr-2 w-6">#</th>
                  <th className="text-left pb-2">Όνομα</th>
                  <th className="text-right pb-2 pl-4">Σκορ</th>
                </tr>
              </thead>
              <tbody>
                {top20.map((row) => (
                  <tr
                    key={row.rank}
                    className={`${lbRowBase} ${row.isPlayer ? lbRowPlayer : ""}`}
                  >
                    <td className={lbTdRank}>{row.rank}</td>
                    <td className={lbTdName}>
                      {row.display_name}
                      {row.isPlayer && (
                        <span className="text-amber-500 ml-1 text-xs">(εσύ)</span>
                      )}
                    </td>
                    <td className={lbTdScore}>{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isLoading && playerRow && (
            <>
              <div className="border-t-2 border-dashed border-stone-200 my-3" />
              <table className="w-full">
                <tbody>
                  <tr className={`${lbRowBase} ${lbRowPlayer}`}>
                    <td className={lbTdRank}>{playerRow.rank}</td>
                    <td className={lbTdName}>
                      {playerRow.display_name}
                      <span className="text-amber-500 ml-1 text-xs">(εσύ)</span>
                    </td>
                    <td className={lbTdScore}>{playerRow.score}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        {!isViewingCurrentPuzzle && selectedDate <= today && (
          <div className="px-5 py-3 border-t border-stone-100 text-center">
            <Link
              href={`/leksokipos?puzzle=${selectedDate}`}
              onClick={onClose}
              className="text-sm text-stone-600 underline hover:text-stone-800 transition-colors"
            >
              Παίξε αυτό το παζλ →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
