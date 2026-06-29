"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { btnCancel, btnModalSubmit, inputClass, labelClass, labelOptionalClass } from "@/styles/recipes";

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

export function CommunityVresTinFrasiSubmitModal({ isOpen, onClose }: Props) {
  const [phrase, setPhrase]           = useState("");
  const [submitterName, setName]      = useState("");
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [status, setStatus]           = useState<"idle" | "submitting" | "success" | "error">("idle");

  if (!isOpen) return null;

  function handleClose() {
    setPhrase("");
    setName("");
    setErrors({});
    setStatus("idle");
    onClose();
  }

  async function handleSubmit() {
    setErrors({});
    setStatus("submitting");
    try {
      const res = await fetch("/api/community-puzzles/vrestifrasi", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitter_name: submitterName.trim() || undefined,
          phrase:         phrase.trim(),
        }),
      });
      if (res.status === 422) {
        const json = await res.json() as { errors?: Record<string, string>; error?: string };
        if (json.error) {
          setErrors({ general: json.error });
        } else {
          setErrors(json.errors ?? {});
        }
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
      <Modal isOpen={isOpen} onClose={handleClose} showClose={false}>
        <div className="text-center py-4">
          <p className="text-3xl mb-3">🙏</p>
          <p className="font-semibold text-foreground mb-1">Ευχαριστούμε!</p>
          <p className="text-sm text-muted">Η φράση σου στάλθηκε για έλεγχο.</p>
          <button onClick={handleClose} className="mt-5 px-6 py-2 rounded-xl bg-inverted text-inverted-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
            Κλείσιμο
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} closeLabel="Close" cardClassName="max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-foreground mb-1">Υποβολή Φράσης</h2>
        <p className="text-xs text-muted mb-5 leading-relaxed">
          Πρότεινε μια ελληνική φράση (3–4 λέξεις, κάθε λέξη 2–8 γράμματα).
          Θα γίνει το παζλ Vres Tin Frasi για μία ολόκληρη μέρα αν εγκριθεί.
        </p>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Φράση</label>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="π.χ. Φτώχεια και αρετή"
              maxLength={60}
              className={inputClass}
            />
            {errors.general && <p className="text-xs text-danger mt-1">{errors.general}</p>}
            {Object.entries(errors)
              .filter(([k]) => k !== "general")
              .map(([k, v]) => (
                <p key={k} className="text-xs text-danger mt-1">{v}</p>
              ))}
          </div>

          <div>
            <label className={labelClass}>
              Όνομα <span className={labelOptionalClass}>(προαιρετικό)</span>
            </label>
            <input
              value={submitterName}
              onChange={(e) => setName(e.target.value)}
              placeholder="π.χ. Νίκος"
              maxLength={50}
              className={inputClass}
            />
          </div>
        </div>

        {status === "error" && (
          <p className="text-xs text-danger mt-2">Κάτι πήγε στραβά. Δοκίμασε ξανά.</p>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={handleClose} className={btnCancel}>Ακύρωση</button>
          <button onClick={handleSubmit} disabled={status === "submitting"} className={btnModalSubmit}>
            {status === "submitting" ? "…" : "Αποστολή"}
          </button>
        </div>
    </Modal>
  );
}
