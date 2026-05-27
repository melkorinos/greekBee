"use client";

// ProfileSection — unified cross-device profile UI for all game leaderboards.
//
// Modes:
//   idle        — unlinked: shows "Σύνδεση με κωδικό" + "Αποσύνδεση" + optional createError
//   claiming    — unlinked: 6-char code input to adopt another device's identity
//   linked      — shows name, "Μεταφορά", "Αποσύνδεση"
//   transferring— shows generated transfer code with copy button
//   confirming  — disconnect confirmation prompt

import { btnPrimaryCompact, inputCompactClass, labelClass } from "@/components/leksokipos/styles";
import { useEffect, useState } from "react";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ProfileSectionProps {
  profileLinked:        boolean;
  displayName:          string;
  /** Error message from the name-editor-triggered profile creation flow. */
  createError?:         string;
  onTransferGenerate:   () => Promise<string>;
  onTransferClaim:      (code: string) => Promise<void>;
  onDisconnect:         () => void;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileMode = "idle" | "claiming" | "linked" | "transferring" | "confirming";

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileSection({
  profileLinked,
  displayName,
  createError,
  onTransferGenerate,
  onTransferClaim,
  onDisconnect,
}: ProfileSectionProps) {
  const [mode,         setMode]         = useState<ProfileMode>(profileLinked ? "linked" : "idle");
  const [codeInput,    setCodeInput]    = useState("");
  const [claimError,   setClaimError]   = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [transferCode, setTransferCode] = useState("");
  const [copied,       setCopied]       = useState(false);

  // Sync mode when profileLinked changes (e.g. after profile creation from name editor).
  useEffect(() => {
    if (profileLinked && (mode === "idle" || mode === "claiming")) setMode("linked");
    else if (!profileLinked && mode === "linked") setMode("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLinked]);

  async function handleClaim() {
    if (!codeInput.trim()) return;
    setLoading(true);
    setClaimError(null);
    try {
      await onTransferClaim(codeInput.trim());
      // profileLinked prop will flip → useEffect moves to "linked"
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : "Σφάλμα. Δοκίμασε ξανά.");
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const code = await onTransferGenerate();
      setTransferCode(code);
      setMode("transferring");
    } catch {
      // stay in linked mode — error is minor
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(transferCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  function handleDisconnect() {
    onDisconnect();
    setMode("idle");
    setCodeInput("");
    setClaimError(null);
    setTransferCode("");
  }

  function cancelClaim() {
    setMode("idle");
    setCodeInput("");
    setClaimError(null);
  }

  return (
    <div className="px-5 py-3">
      <p className={`${labelClass} mb-1.5`}>Συγχρονισμός συσκευών</p>

      {/* ── Idle (unlinked) ──────────────────────────────────────────────────── */}
      {mode === "idle" && (
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode("claiming")}
              className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
            >
              Σύνδεση με κωδικό
            </button>
            <span className="text-stone-300 dark:text-stone-600 select-none">|</span>
            <button
              onClick={() => setMode("confirming")}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors"
            >
              Αποσύνδεση
            </button>
          </div>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Έχεις ήδη προφίλ σε άλλη συσκευή; Μεταφέρτο εδώ με «Σύνδεση με κωδικό».
          </p>
          {createError && <p className="text-xs text-red-500 mt-1">{createError}</p>}
        </div>
      )}

      {/* ── Claiming (enter transfer code) ───────────────────────────────────── */}
      {mode === "claiming" && (
        <div className="space-y-2">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Άνοιξε τον πίνακα σκορ στην <strong>άλλη συσκευή</strong>, πάτα «Μεταφορά» και εισάγε τον κωδικό εδώ:
          </p>
          <input
            type="text"
            placeholder="Κωδικός μεταφοράς (π.χ. A7K2M9)"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && !loading && void handleClaim()}
            className={`w-full ${inputCompactClass} uppercase tracking-widest`}
            autoFocus
            maxLength={6}
          />
          {claimError && <p className="text-xs text-red-500">{claimError}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={cancelClaim}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Άκυρο
            </button>
            <button
              onClick={() => void handleClaim()}
              disabled={loading || codeInput.trim().length < 6}
              className={btnPrimaryCompact}
            >
              {loading ? "…" : "Σύνδεση"}
            </button>
          </div>
        </div>
      )}

      {/* ── Linked ───────────────────────────────────────────────────────────── */}
      {mode === "linked" && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
            ✓ {displayName || "Ανώνυμος"}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleGenerate()}
              disabled={loading}
              title="Δημιούργησε κωδικό για να συνδεθείς από άλλη συσκευή"
              className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
            >
              {loading ? "…" : "Μεταφορά σε άλλη συσκευή"}
            </button>
            <span className="text-stone-300 dark:text-stone-600 select-none">|</span>
            <button
              onClick={() => setMode("confirming")}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors"
            >
              Αποσύνδεση
            </button>
          </div>
        </div>
      )}

      {/* ── Transferring (show generated code) ───────────────────────────────── */}
      {mode === "transferring" && (
        <div className="space-y-2">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Ο κωδικός μεταφοράς σου:
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold tracking-[0.25em] text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-1.5">
              {transferCode}
            </span>
            <button
              onClick={() => void handleCopy()}
              className="text-xs text-stone-500 border border-stone-200 dark:border-stone-700 rounded px-2 py-1 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              {copied ? "✓ Αντιγράφηκε" : "Αντιγραφή"}
            </button>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Στη <strong>νέα συσκευή</strong>: άνοιξε τον πίνακα σκορ → «Σύνδεση με κωδικό» → εισάγε τον κωδικό.
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">Ισχύει για 24 ώρες · μία χρήση.</p>
          <button
            onClick={() => setMode("linked")}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← Πίσω
          </button>
        </div>
      )}

      {/* ── Disconnect confirmation ───────────────────────────────────────────── */}
      {mode === "confirming" && (
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
            onClick={() => setMode(profileLinked ? "linked" : "idle")}
            className="text-xs text-stone-500 border border-stone-200 dark:border-stone-700 rounded-full px-3 py-1 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Άκυρο
          </button>
        </div>
      )}
    </div>
  );
}
