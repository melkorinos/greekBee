"use client";

// SuggestWordModal — lets the player propose a rejected word for review.
// Opened from FeedbackMessage when a word returns "not_in_list".
// Submits to POST /api/suggest-word (stubbed until Supabase is wired).
// onSuccess is called after a successful POST so the parent can mark the
// word as already-suggested in localStorage and prevent re-submission.

import { useState } from "react";

interface SuggestWordModalProps {
  /** The word to suggest — pre-filled and read-only */
  word:      string;
  isOpen:    boolean;
  onClose:   () => void;
  /** Called after the POST succeeds — use to record the dedup marker */
  onSuccess: () => void;
}

export function SuggestWordModal({
  word,
  isOpen,
  onClose,
  onSuccess,
}: SuggestWordModalProps) {
  const [playerName, setPlayerName] = useState("");
  const [note,       setNote]       = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  if (!isOpen) return null;

  async function handleSubmit() {
    setStatus("submitting");
    try {
      const res = await fetch("/api/suggest-word", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          word:       word.toLowerCase(),
          playerName: playerName.trim() || undefined,
          note:       note.trim()       || undefined,
        }),
      });
      if (!res.ok) throw new Error("server error");
      setStatus("success");
      onSuccess();
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    setPlayerName("");
    setNote("");
    setStatus("idle");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={handleClose}
      data-testid="suggest-modal-backdrop"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
        data-testid="suggest-modal"
      >
        {/* Close */}
        <button
          onClick={handleClose}
          aria-label="Close"
          data-testid="suggest-modal-close"
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-xl leading-none"
        >
          ✕
        </button>

        {status === "success" ? (
          // ── Success state ────────────────────────────────────────────────
          <div className="text-center py-4" data-testid="suggest-modal-success">
            <p className="text-3xl mb-3">🙏</p>
            <p className="font-semibold text-stone-800 mb-1">Ευχαριστούμε!</p>
            <p className="text-sm text-stone-500">
              Η πρότασή σου για τη λέξη{" "}
              <strong>{word.toUpperCase()}</strong> καταχωρήθηκε.
            </p>
            <button
              onClick={handleClose}
              className="mt-5 px-6 py-2 rounded-xl bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 transition-colors"
            >
              Κλείσιμο
            </button>
          </div>
        ) : (
          // ── Form state ───────────────────────────────────────────────────
          <>
            <h2 className="text-lg font-bold text-stone-800 mb-1">
              Πρότεινε λέξη
            </h2>
            <p className="text-xs text-stone-500 mb-5 leading-relaxed">
              Η λέξη <strong className="text-stone-700">{word.toUpperCase()}</strong> δεν
              βρέθηκε στη λίστα μας. Αν πιστεύεις ότι πρέπει να προστεθεί,
              στείλε μας πρόταση!
            </p>

            <div className="space-y-3">
              {/* Word — read-only */}
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">
                  Λέξη
                </label>
                <input
                  value={word.toUpperCase()}
                  readOnly
                  data-testid="suggest-modal-word"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-400 text-sm font-mono select-none"
                />
              </div>

              {/* Player name — optional */}
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">
                  Όνομα{" "}
                  <span className="font-normal text-stone-400">(προαιρετικό)</span>
                </label>
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="π.χ. Νίκος"
                  maxLength={50}
                  data-testid="suggest-modal-name"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 transition-shadow"
                />
              </div>

              {/* Note — optional */}
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">
                  Σχόλιο{" "}
                  <span className="font-normal text-stone-400">(προαιρετικό)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="π.χ. σημαίνει... / το χρησιμοποιούμε στη..."
                  maxLength={200}
                  rows={3}
                  data-testid="suggest-modal-note"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-300 transition-shadow"
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-xs text-red-500 mt-2" data-testid="suggest-modal-error">
                Κάτι πήγε στραβά. Δοκίμασε ξανά.
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleClose}
                data-testid="suggest-modal-cancel"
                className="flex-1 py-2 rounded-xl border border-stone-300 text-stone-600 text-sm font-medium hover:bg-stone-50 active:bg-stone-100 transition-colors"
              >
                Ακύρωση
              </button>
              <button
                onClick={handleSubmit}
                disabled={status === "submitting"}
                data-testid="suggest-modal-submit"
                className="flex-1 py-2 rounded-xl bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 active:bg-stone-900 disabled:opacity-50 transition-colors"
              >
                {status === "submitting" ? "…" : "Αποστολή"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
