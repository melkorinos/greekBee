"use client";

// ProfileSection — unified cross-device profile UI for all game leaderboards.
//
// Modes:
//   idle        — unlinked: shows Google sign-in + "Σύνδεση με κωδικό" + optional createError
//   claiming    — unlinked: 6-char code input to adopt another device's identity
//   linked      — ProfileLinked (no Google): shows name, "Μεταφορά", "Αποσύνδεση"
//   transferring— shows generated transfer code with copy button
//   confirming  — disconnect confirmation prompt
//
// When authLinked=true: TransferCode block is replaced with Google account indicator + sign-out.

import { btnPrimaryCompact, inputCompactClass, labelClass } from "@/styles/recipes";
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
  /** Google auth state — when true, TransferCode block is hidden. */
  authLinked?:          boolean;
  authUserName?:        string | null;
  onSignIn?:            () => Promise<void>;
  onSignOut?:           () => Promise<void>;
  /** Name save handler — when provided, renders the nickname input in idle mode. */
  onSaveName?:          (name: string) => void;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileMode = "idle" | "claiming" | "linked" | "transferring" | "confirming";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileSection({
  profileLinked,
  displayName,
  createError,
  onTransferGenerate,
  onTransferClaim,
  onDisconnect,
  authLinked  = false,
  authUserName = null,
  onSignIn,
  onSignOut,
  onSaveName,
}: ProfileSectionProps) {
  const [mode,         setMode]         = useState<ProfileMode>(profileLinked ? "linked" : "idle");
  const [nameInput,    setNameInput]    = useState(displayName);
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

  useEffect(() => { setNameInput(displayName); }, [displayName]);

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

  function handleNameSave() {
    onSaveName?.(nameInput.trim());
  }

  function cancelClaim() {
    setMode("idle");
    setCodeInput("");
    setClaimError(null);
  }

  return (
    <div className="px-5 py-3">
      <p className={`${labelClass} mb-1.5`}>
        {!authLinked && mode !== "idle" ? "Συγχρονισμός συσκευών" : "Εμφάνισου στον πίνακα"}
      </p>

      {/* ── AuthLinked — Google account connected ────────────────────────────── */}
      {authLinked && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-correct font-semibold">
            ✓ {authUserName ?? displayName ?? "Συνδεδεμένος"}
          </span>
          {onSignOut && (
            <button
              onClick={() => void onSignOut()}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors"
            >
              Αποσύνδεση Google
            </button>
          )}
        </div>
      )}

      {/* ── Idle (unlinked) ──────────────────────────────────────────────────── */}
      {!authLinked && mode === "idle" && (
        <div className="space-y-2">
          {onSignIn && (
            <button
              onClick={() => void onSignIn()}
              className="w-full flex items-center justify-center gap-2 text-xs font-medium border border-border rounded-lg px-3 py-2 hover:bg-surface-raised transition-colors text-foreground"
            >
              <GoogleIcon />
              Σύνδεση με Google
            </button>
          )}
          {onSignIn && onSaveName && (
            <div className="flex items-center gap-2">
              <hr className="flex-1 border-border" />
              <span className="text-xs text-muted whitespace-nowrap">ή χρησιμοποίησε ψευδώνυμο</span>
              <hr className="flex-1 border-border" />
            </div>
          )}
          {onSaveName && (
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                placeholder="Ανώνυμος"
                maxLength={30}
                className={`flex-1 ${inputCompactClass}`}
              />
              <button onClick={handleNameSave} className={btnPrimaryCompact}>
                Αποθήκευση
              </button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode("claiming")}
              className="text-xs text-stone-500 underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Σύνδεση με κωδικό
            </button>
            <span className="text-muted select-none">|</span>
            <button
              onClick={() => setMode("confirming")}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors"
            >
              Αποσύνδεση
            </button>
          </div>
          {createError && <p className="text-xs text-red-500 mt-1">{createError}</p>}
        </div>
      )}

      {/* ── Claiming (enter transfer code) ───────────────────────────────────── */}
      {!authLinked && mode === "claiming" && (
        <div className="space-y-2">
          <p className="text-xs text-muted">
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

      {/* ── Linked (ProfileLinked, no Google) ────────────────────────────────── */}
      {!authLinked && mode === "linked" && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-correct font-semibold">
            ✓ {displayName || "Ανώνυμος"}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleGenerate()}
              disabled={loading}
              title="Δημιούργησε κωδικό για να συνδεθείς από άλλη συσκευή"
              className="text-xs text-stone-500 underline underline-offset-2 hover:text-foreground transition-colors"
            >
              {loading ? "…" : "Μεταφορά σε άλλη συσκευή"}
            </button>
            <span className="text-muted select-none">|</span>
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
      {!authLinked && mode === "transferring" && (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            Ο κωδικός μεταφοράς σου:
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold tracking-[0.25em] text-foreground bg-surface-raised border border-border rounded-lg px-3 py-1.5">
              {transferCode}
            </span>
            <button
              onClick={() => void handleCopy()}
              className="text-xs text-stone-500 border border-border rounded px-2 py-1 hover:bg-surface-raised transition-colors"
            >
              {copied ? "✓ Αντιγράφηκε" : "Αντιγραφή"}
            </button>
          </div>
          <p className="text-xs text-muted">
            Στη <strong>νέα συσκευή</strong>: άνοιξε τον πίνακα σκορ → «Σύνδεση με κωδικό» → εισάγε τον κωδικό.
          </p>
          <p className="text-xs text-muted">Ισχύει για 24 ώρες · μία χρήση.</p>
          <button
            onClick={() => setMode("linked")}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← Πίσω
          </button>
        </div>
      )}

      {/* ── Disconnect confirmation ───────────────────────────────────────────── */}
      {!authLinked && mode === "confirming" && (
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
            className="text-xs text-stone-500 border border-border rounded-full px-3 py-1 hover:bg-surface-raised transition-colors"
          >
            Άκυρο
          </button>
        </div>
      )}
    </div>
  );
}
