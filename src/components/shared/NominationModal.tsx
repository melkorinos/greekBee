"use client";

import { btnCancel, btnModalSubmit, inputClass, inputReadonlyClass, labelClass, labelOptionalClass } from "@/components/leksokipos/styles";

import { getOrCreateDeviceId } from "@/hooks/useGameStore";
import { useCallback, useEffect, useState } from "react";

interface LookupResult {
  word:     string; // the lowercase+trim word this result applies to
  rejected: number;
  pending:  number;
}

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
  const [lookup,       setLookup]       = useState<LookupResult | null>(null);
  const [noteMissing,  setNoteMissing]  = useState(false);

  const word = wordEditable ? editableWord : wordProp;
  const c    = copy[direction];
  const key  = word.trim().toLowerCase();

  // Look up prior rejections / pending duplicates for `target` (lowercase+trim).
  const runLookup = useCallback(
    async (target: string): Promise<LookupResult | null> => {
      if (target.length < 2) {
        setLookup(null);
        return null;
      }
      try {
        const res = await fetch(
          `/api/nominations/lookup?word=${encodeURIComponent(target)}&direction=${direction}`,
        );
        if (!res.ok) return null;
        const data = (await res.json()) as { rejected?: number; pending?: number };
        const result: LookupResult = {
          word:     target,
          rejected: data.rejected ?? 0,
          pending:  data.pending  ?? 0,
        };
        setLookup(result);
        return result;
      } catch {
        return null; // network failure → no warning, never blocks submission
      }
    },
    [direction],
  );

  // Non-editable word (e.g. in-game flag) has no blur moment — check on open.
  useEffect(() => {
    if (!isOpen || wordEditable) return;
    const target = wordProp.trim().toLowerCase();
    if (target) runLookup(target);
  }, [isOpen, wordEditable, wordProp, runLookup]);

  if (!isOpen) return null;

  // A warning applies only while the looked-up word still matches the input.
  const rejectedHit = !!lookup && lookup.word === key && lookup.rejected > 0;
  const pendingHit  = !!lookup && lookup.word === key && lookup.rejected === 0 && lookup.pending > 0;
  // Previously-rejected words require an explanation before re-submitting.
  const noteRequired = rejectedHit;

  async function handleSubmit() {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;

    // Ensure the rejection check is current for this exact word before posting.
    const lk = lookup && lookup.word === trimmed ? lookup : await runLookup(trimmed);
    if (lk && lk.rejected > 0 && !note.trim()) {
      setNoteMissing(true); // mandatory explanation for a previously-rejected word
      return;
    }
    setNoteMissing(false);

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
    setLookup(null);
    setNoteMissing(false);
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
        className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
        data-testid="nomination-modal"
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          data-testid="nomination-modal-close"
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300 text-xl leading-none"
        >
          ✕
        </button>

        {status === "success" ? (
          <div className="text-center py-4" data-testid="nomination-modal-success">
            <p className="text-3xl mb-3">🙏</p>
            <p className="font-semibold text-stone-800 dark:text-stone-100 mb-1">Ευχαριστούμε!</p>
            <p className="text-sm text-stone-500 dark:text-stone-400">{c.success(word.trim())}</p>
            <button
              onClick={handleClose}
              className="mt-5 px-6 py-2 rounded-xl bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-100 transition-colors"
            >
              Κλείσιμο
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-1">{c.title}</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">
              {c.body(word.trim() || "…")}
            </p>

            {rejectedHit && (
              <div
                data-testid="nomination-rejected-warning"
                className="mb-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950 px-3 py-2.5"
              >
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  ⚠ Αυτή η λέξη έχει ξαναπροταθεί και απορρίφθηκε.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                  Μπορείς να την ξαναστείλεις, αλλά εξήγησε καθαρά γιατί πιστεύεις ότι πρόκειται για
                  λάθος — η εξήγηση είναι <strong>υποχρεωτική</strong>.
                </p>
              </div>
            )}

            {pendingHit && (
              <div
                data-testid="nomination-pending-info"
                className="mb-4 rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950 px-3 py-2.5"
              >
                <p className="text-xs text-sky-800 dark:text-sky-200 leading-relaxed">
                  ℹ Υπάρχει ήδη ενεργή πρόταση για αυτή τη λέξη. Μπορείς να την ψηφίσεις αντί να
                  στείλεις διπλή πρόταση.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className={labelClass}>Λέξη</label>
                {wordEditable ? (
                  <input
                    value={editableWord}
                    onChange={(e) => {
                      setEditableWord(e.target.value);
                      setLookup(null);      // word changed → drop any stale warning
                      setNoteMissing(false);
                    }}
                    onBlur={(e) => runLookup(e.target.value.trim().toLowerCase())}
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
                  Σχόλιο{" "}
                  {noteRequired ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">(υποχρεωτικό)</span>
                  ) : (
                    <span className={labelOptionalClass}>(προαιρετικό)</span>
                  )}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    if (e.target.value.trim()) setNoteMissing(false);
                  }}
                  placeholder={c.notePlaceholder}
                  maxLength={200}
                  rows={3}
                  data-testid="nomination-modal-note"
                  className={`${inputClass} resize-none ${
                    noteMissing ? "border-amber-500 ring-1 ring-amber-500" : ""
                  }`}
                />
                {noteMissing && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1" data-testid="nomination-note-required">
                    Πρόσθεσε μια εξήγηση για να ξαναστείλεις αυτή τη λέξη.
                  </p>
                )}
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
                disabled={
                  status === "submitting" ||
                  (!wordEditable && !word.trim()) ||
                  (noteRequired && !note.trim())
                }
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
