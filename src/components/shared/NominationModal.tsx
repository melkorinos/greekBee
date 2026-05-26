"use client";

import { btnCancel, btnModalSubmit, inputClass, inputReadonlyClass, labelClass, labelOptionalClass } from "@/components/leksokipos/styles";

import { getOrCreateDeviceId } from "@/hooks/useGameStore";
import { useState } from "react";

interface NominationModalProps {
  word: string;
  /** True when the caller hasn't pre-selected a word (e.g. Leksikastirio form). */
  wordEditable?: boolean;
  direction: "add" | "remove";
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful POST so the caller can update dedup state. */
  onSuccess: (word: string) => void;
}

const copy = {
  add: {
    title:       "Πρότεινε λέξη",
    body:        (word: string) =>
      `Αν πιστεύεις ότι η λέξη ${word.toUpperCase()} πρέπει να προστεθεί στη λίστα, στείλε μας πρόταση!`,
    notePlaceholder: "π.χ. σημαίνει… / το χρησιμοποιούμε στη…",
    success:     (word: string) => `Η πρότασή σου για τη λέξη ${word.toUpperCase()} καταχωρήθηκε.`,
  },
  remove: {
    title:       "Αναφορά λέξης",
    body:        (word: string) =>
      `Αν πιστεύεις ότι η λέξη ${word.toUpperCase()} δεν πρέπει να είναι στη λίστα, στείλε μας αναφορά!`,
    notePlaceholder: "π.χ. δεν είναι ελληνική λέξη / είναι κύριο όνομα…",
    success:     (word: string) => `Η αναφορά σου για τη λέξη ${word.toUpperCase()} καταχωρήθηκε.`,
  },
};

export function NominationModal({
  word: wordProp,
  wordEditable = false,
  direction,
  isOpen,
  onClose,
  onSuccess,
}: NominationModalProps) {
  // Editable word is local state; non-editable reads directly from props so the
  // component doesn't need to unmount/remount to pick up a changed word prop.
  const [editableWord, setEditableWord] = useState("");
  const [playerName,   setPlayerName]   = useState("");
  const [note,         setNote]         = useState("");
  const [status,       setStatus]       = useState<"idle" | "submitting" | "success" | "error">("idle");

  const word = wordEditable ? editableWord : wordProp;
  const c    = copy[direction];

  if (!isOpen) return null;

  async function handleSubmit() {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/nominations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          word:       trimmed,
          direction,
          playerName: playerName.trim() || undefined,
          note:       note.trim()       || undefined,
          deviceId:   getOrCreateDeviceId(),
        }),
      });
      if (!res.ok) {
        throw new Error("server error");
      }
      setStatus("success");
      onSuccess(trimmed);
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    setEditableWord("");
    setPlayerName("");
    setNote("");
    setStatus("idle");
    onClose();
  }

  const displayWord = word.toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={handleClose}
      data-testid="nomination-modal-backdrop"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
        data-testid="nomination-modal"
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          data-testid="nomination-modal-close"
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-xl leading-none"
        >
          ✕
        </button>

        {status === "success" ? (
          <div className="text-center py-4" data-testid="nomination-modal-success">
            <p className="text-3xl mb-3">🙏</p>
            <p className="font-semibold text-stone-800 mb-1">Ευχαριστούμε!</p>
            <p className="text-sm text-stone-500">{c.success(word.trim())}</p>
            <button
              onClick={handleClose}
              className="mt-5 px-6 py-2 rounded-xl bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 transition-colors"
            >
              Κλείσιμο
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-stone-800 mb-1">{c.title}</h2>
            <p className="text-xs text-stone-500 mb-5 leading-relaxed">
              {c.body(word.trim() || "…")}
            </p>

            <div className="space-y-3">
              <div>
                <label className={labelClass}>Λέξη</label>
                {wordEditable ? (
                  <input
                    value={editableWord}
                    onChange={(e) => setEditableWord(e.target.value)}
                    placeholder="π.χ. ΑΓΑΠΗ"
                    maxLength={50}
                    data-testid="nomination-modal-word-input"
                    className={inputClass}
                  />
                ) : (
                  <input
                    value={displayWord}
                    readOnly
                    data-testid="nomination-modal-word"
                    className={inputReadonlyClass}
                  />
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Όνομα <span className={labelOptionalClass}>(προαιρετικό)</span>
                </label>
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="π.χ. Νίκος"
                  maxLength={50}
                  data-testid="nomination-modal-name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Σχόλιο <span className={labelOptionalClass}>(προαιρετικό)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={c.notePlaceholder}
                  maxLength={200}
                  rows={3}
                  data-testid="nomination-modal-note"
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-xs text-red-500 mt-2" data-testid="nomination-modal-error">
                Κάτι πήγε στραβά. Δοκίμασε ξανά.
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleClose}
                data-testid="nomination-modal-cancel"
                className={btnCancel}
              >
                Ακύρωση
              </button>
              <button
                onClick={handleSubmit}
                disabled={status === "submitting" || (!wordEditable && !word.trim())}
                data-testid="nomination-modal-submit"
                className={btnModalSubmit}
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
