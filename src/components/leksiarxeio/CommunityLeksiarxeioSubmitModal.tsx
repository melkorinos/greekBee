"use client";

import { useState } from "react";
import { NominationModal } from "@/components/shared/NominationModal";
import { btnCancel, btnModalSubmit, inputClass, labelClass, labelOptionalClass } from "@/components/leksokipos/styles";

const LENGTHS = [4, 5, 6, 7, 8] as const;
const LENGTH_LABELS: Record<number, string> = { 4: "4 γράμματα", 5: "5 γράμματα", 6: "6 γράμματα", 7: "7 γράμματα", 8: "8 γράμματα" };

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type WordErrors = Partial<Record<number, string>>;

export function CommunityLeksiarxeioSubmitModal({ isOpen, onClose }: Props) {
  const [words, setWords]               = useState<Record<number, string>>({ 4: "", 5: "", 6: "", 7: "", 8: "" });
  const [submitterName, setSubmitterName] = useState("");
  const [errors, setErrors]             = useState<WordErrors>({});
  const [status, setStatus]             = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [nominateWord, setNominateWord] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleClose() {
    setWords({ 4: "", 5: "", 6: "", 7: "", 8: "" });
    setSubmitterName("");
    setErrors({});
    setStatus("idle");
    onClose();
  }

  async function handleSubmit() {
    setErrors({});
    setStatus("submitting");
    try {
      const res = await fetch("/api/community-puzzles/leksiarxeio", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitter_name: submitterName.trim() || undefined,
          words: Object.fromEntries(LENGTHS.map((l) => [String(l), words[l].trim()])),
        }),
      });
      if (res.status === 422) {
        const json = await res.json() as { errors: Record<string, string> };
        const mapped: WordErrors = {};
        for (const [k, v] of Object.entries(json.errors)) mapped[Number(k)] = v;
        setErrors(mapped);
        setStatus("idle");
        return;
      }
      if (!res.ok) throw new Error("server error");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={handleClose}>
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
          <div className="text-center py-4">
            <p className="text-3xl mb-3">🙏</p>
            <p className="font-semibold text-stone-800 dark:text-stone-100 mb-1">Ευχαριστούμε!</p>
            <p className="text-sm text-stone-500 dark:text-stone-400">Το παζλ σου στάλθηκε για έλεγχο.</p>
            <button onClick={handleClose} className="mt-5 px-6 py-2 rounded-xl bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-100 transition-colors">
              Κλείσιμο
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={handleClose}>
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-sm p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <button onClick={handleClose} aria-label="Close" className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300 text-xl leading-none">✕</button>

          <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-1">Υποβολή Παζλ Leksiarxeio</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">
            Οι 5 λέξεις σου θα γίνουν το παζλ Leksiarxeio για μία ολόκληρη μέρα.
          </p>

          <div className="space-y-3">
            {LENGTHS.map((len) => (
              <div key={len}>
                <label className={labelClass}>{LENGTH_LABELS[len]}</label>
                <input
                  value={words[len]}
                  onChange={(e) => setWords((prev) => ({ ...prev, [len]: e.target.value }))}
                  placeholder={`Λέξη ${len} γραμμάτων`}
                  maxLength={len + 2}
                  className={inputClass}
                />
                {errors[len] && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-red-500">{errors[len]}</p>
                    <button
                      type="button"
                      className="text-xs text-blue-500 underline"
                      onClick={() => setNominateWord(words[len].trim().toLowerCase())}
                    >
                      Πρότεινε τη λέξη
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div>
              <label className={labelClass}>
                Όνομα <span className={labelOptionalClass}>(προαιρετικό)</span>
              </label>
              <input
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="π.χ. Νίκος"
                maxLength={50}
                className={inputClass}
              />
            </div>
          </div>

          {status === "error" && (
            <p className="text-xs text-red-500 mt-2">Κάτι πήγε στραβά. Δοκίμασε ξανά.</p>
          )}

          <div className="flex gap-2 mt-5">
            <button onClick={handleClose} className={btnCancel}>Ακύρωση</button>
            <button onClick={handleSubmit} disabled={status === "submitting"} className={btnModalSubmit}>
              {status === "submitting" ? "…" : "Αποστολή"}
            </button>
          </div>
        </div>
      </div>

      {nominateWord !== null && (
        <NominationModal
          word={nominateWord}
          direction="add"
          isOpen
          onClose={() => setNominateWord(null)}
          onSuccess={() => setNominateWord(null)}
        />
      )}
    </>
  );
}
