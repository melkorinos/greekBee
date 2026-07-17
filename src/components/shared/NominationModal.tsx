"use client";

import { btnCancel, btnModalPrimary, btnModalSubmit, inputClass, inputReadonlyClass, labelClass, labelOptionalClass } from "@/styles/recipes";

import { Modal } from "./Modal";
import { getOrCreateDeviceId } from "@/hooks/useGameStore";
import { deriveBanner, guardSubmit, pivotFor, type NominationLookup } from "@/lib/nominationDecision";
import { normalizeLetters } from "@/lib/normalize";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [lookup,       setLookup]       = useState<NominationLookup | null>(null);
  const [noteMissing,  setNoteMissing]  = useState(false);
  const [successMode,  setSuccessMode]  = useState<"submitted" | "upvoted">("submitted");

  // Re-entrancy lock for the two mutating actions (submit / upvote). `status`
  // can't do this job: it's React state, so it only disables the button on the
  // NEXT render — a held Enter key or a fast double-click fires several handlers
  // before that, and each one sails past the duplicate checks and POSTs. A ref
  // flips synchronously, so the burst is stopped on the very first re-entry.
  // (This is what put six identical αγοραροσ rows in the DB within 32 ms.)
  const busyRef = useRef(false);

  const word = wordEditable ? editableWord : wordProp;
  const c    = copy[direction];
  // Normalise the key the same way the server does (accent-stripped, final sigma
  // collapsed) so `lookup.word === key` matches even when the player typed accents.
  const key  = normalizeLetters(word.trim());

  // Look up prior rejections / pending duplicates for `target` (lowercase+trim).
  const runLookup = useCallback(
    async (target: string): Promise<NominationLookup | null> => {
      if (target.length < 2) {
        setLookup(null);
        return null;
      }
      try {
        const res = await fetch(
          `/api/nominations/lookup?word=${encodeURIComponent(target)}&direction=${direction}`,
        );
        if (!res.ok) return null;
        const data = (await res.json()) as { blocked?: boolean; rejected?: number; accepted?: number; pending?: number; pendingId?: string | null };
        const result: NominationLookup = {
          word:      target,
          blocked:   data.blocked   ?? false,
          rejected:  data.rejected  ?? 0,
          accepted:  data.accepted  ?? 0,
          pending:   data.pending   ?? 0,
          pendingId: data.pendingId ?? null,
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
    const target = normalizeLetters(wordProp.trim());
    if (target) runLookup(target);
  }, [isOpen, wordEditable, wordProp, runLookup]);

  if (!isOpen) return null;

  const banner      = deriveBanner(lookup, key);
  const blockedHit  = banner === "blocked";
  const rejectedHit = banner === "rejected";
  const acceptedHit = banner === "accepted";
  const pendingHit  = banner === "pending";
  // Previously-rejected words require an explanation before re-submitting.
  const noteRequired = rejectedHit;

  async function handleSubmit() {
    if (busyRef.current) return; // a burst of clicks must produce one POST, not N
    busyRef.current = true;
    try {
      await submitOnce();
    } finally {
      busyRef.current = false;
    }
  }

  async function submitOnce() {
    const trimmed = normalizeLetters(word.trim());
    if (!trimmed) return;

    // Ensure the checks are current for this exact word before posting.
    const lk = lookup && lookup.word === trimmed ? lookup : await runLookup(trimmed);

    // Every refusal below is already visible: the setLookup inside runLookup
    // surfaces the matching banner and disables the button. Bailing is enough.
    const guard = guardSubmit(lk, note);
    setNoteMissing(guard.ok === false && guard.reason === "note-required");
    if (!guard.ok) return;

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
      // A refusal the server decided (blocklist 422 / pending-uniqueness 409)
      // becomes a lookup, so the same banner surfaces as if we had caught it.
      if (res.status === 422 || res.status === 409) {
        const data  = (await res.json().catch(() => null)) as { pendingId?: string | null } | null;
        const pivot = pivotFor(res.status, trimmed, data);
        if (pivot) {
          setLookup(pivot);
          setStatus("idle");
          return;
        }
      }
      if (!res.ok) {
        throw new Error("server error");
      }
      setSuccessMode("submitted");
      setStatus("success");
      onSuccess(trimmed);
    } catch {
      setStatus("error");
    }
  }

  // Upvote the existing pending proposal instead of submitting a duplicate.
  async function handleUpvoteExisting(targetId: string | null) {
    if (!targetId) return;
    if (busyRef.current) return; // same burst guard as handleSubmit
    busyRef.current = true;
    setStatus("submitting");
    try {
      const res = await fetch(`/api/nominations/${targetId}/vote`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ deviceId: getOrCreateDeviceId(), voteType: "up" }),
      });
      if (!res.ok) {
        throw new Error("server error");
      }
      setSuccessMode("upvoted");
      setStatus("success");
      onSuccess(normalizeLetters(word.trim()));
    } catch {
      setStatus("error");
    } finally {
      busyRef.current = false;
    }
  }

  function handleClose() {
    busyRef.current = false; // never carry a stuck lock into the next open
    setEditableWord("");
    setPlayerName("");
    setNote("");
    setStatus("idle");
    setLookup(null);
    setNoteMissing(false);
    setSuccessMode("submitted");
    onClose();
  }

  const displayWord = word.toUpperCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeLabel="Close"
      backdropTestId="nomination-modal-backdrop"
      cardTestId="nomination-modal"
      closeTestId="nomination-modal-close"
    >
        {status === "success" ? (
          <div className="text-center py-4" data-testid="nomination-modal-success">
            <p className="text-3xl mb-3">{successMode === "upvoted" ? "🗳️" : "🙏"}</p>
            <p className="font-semibold text-foreground mb-1">Ευχαριστούμε!</p>
            <p className="text-sm text-muted">
              {successMode === "upvoted"
                ? `Ψήφισες υπέρ της υπάρχουσας πρότασης για τη λέξη ${word.trim().toUpperCase()}.`
                : c.success(word.trim())}
            </p>
            <button onClick={handleClose} className={`mt-5 ${btnModalPrimary}`}>
              Κλείσιμο
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-foreground mb-1">{c.title}</h2>
            <p className="text-xs text-muted mb-5 leading-relaxed">
              {c.body(word.trim() || "…")}
            </p>

            {blockedHit && (
              <div
                data-testid="nomination-blocked-warning"
                className="mb-4 rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950 px-3 py-2.5"
              >
                <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                  🚫 Δεν δεχόμαστε κύρια ονόματα.
                </p>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                  Ονόματα ανθρώπων, μηνών ή τόπων —  καθώς και ξένες λέξεις — δεν προστίθενται
                  στη λίστα. Δοκίμασε μια κοινή ελληνική λέξη.
                </p>
              </div>
            )}

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

            {acceptedHit && (
              <div
                data-testid="nomination-accepted-info"
                className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 px-3 py-2.5"
              >
                <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                  ✓ Αυτή η λέξη έχει ήδη εγκριθεί και θα προστεθεί στη λίστα με την επόμενη
                  ενημέρωση. Δεν χρειάζεται να την ξαναστείλεις.
                </p>
              </div>
            )}

            {pendingHit && (
              <div
                data-testid="nomination-pending-info"
                className="mb-4 rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950 px-3 py-2.5"
              >
                <p className="text-xs text-sky-800 dark:text-sky-200 leading-relaxed">
                  ℹ Υπάρχει ήδη ενεργή πρόταση για αυτή τη λέξη. Ψήφισέ την αντί να στείλεις
                  διπλή πρόταση.
                </p>
                <button
                  onClick={() => handleUpvoteExisting(lookup?.pendingId ?? null)}
                  disabled={status === "submitting" || !lookup?.pendingId}
                  data-testid="nomination-pending-upvote"
                  className="mt-2.5 w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {status === "submitting" ? "…" : "▲ Ψήφισε υπέρ της υπάρχουσας"}
                </button>
                {status === "error" && (
                  <p className="text-xs text-danger mt-2" data-testid="nomination-upvote-error">
                    Κάτι πήγε στραβά. Δοκίμασε ξανά.
                  </p>
                )}
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
                    onBlur={(e) => runLookup(normalizeLetters(e.target.value.trim()))}
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
              <p className="text-xs text-danger mt-2" data-testid="nomination-modal-error">
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
                  (noteRequired && !note.trim()) ||
                  blockedHit ||
                  acceptedHit ||
                  pendingHit
                }
                data-testid="nomination-modal-submit"
                className={btnModalSubmit}
              >
                {status === "submitting" ? "…" : "Αποστολή"}
              </button>
            </div>
          </>
        )}
    </Modal>
  );
}
