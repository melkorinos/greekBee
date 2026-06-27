"use client";

import { useState } from "react";
import { btnCancel, btnModalSubmit, inputClass, labelClass, labelOptionalClass } from "@/styles/recipes";

const GROUP_HEADERS = [
  "Ομάδα 1 — πιο εύκολη",
  "Ομάδα 2",
  "Ομάδα 3",
  "Ομάδα 4 — πιο δύσκολη",
];

interface Group {
  category: string;
  words: [string, string, string, string];
}

function emptyGroup(): Group {
  return { category: "", words: ["", "", "", ""] };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CommunityLeksindeseisSubmitModal({ isOpen, onClose }: Props) {
  const [groups, setGroups]             = useState<Group[]>([emptyGroup(), emptyGroup(), emptyGroup(), emptyGroup()]);
  const [submitterName, setSubmitterName] = useState("");
  const [status, setStatus]             = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);

  if (!isOpen) return null;

  function handleClose() {
    setGroups([emptyGroup(), emptyGroup(), emptyGroup(), emptyGroup()]);
    setSubmitterName("");
    setStatus("idle");
    setErrorMsg(null);
    onClose();
  }

  function updateCategory(i: number, val: string) {
    setGroups((prev) => prev.map((g, idx) => idx === i ? { ...g, category: val } : g));
  }

  function updateWord(groupIdx: number, wordIdx: number, val: string) {
    setGroups((prev) => prev.map((g, i) => {
      if (i !== groupIdx) return g;
      const words = [...g.words] as [string, string, string, string];
      words[wordIdx] = val;
      return { ...g, words };
    }));
  }

  async function handleSubmit() {
    setErrorMsg(null);
    setStatus("submitting");
    try {
      const res = await fetch("/api/community-puzzles/leksindeseis", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitter_name: submitterName.trim() || undefined,
          groups: groups.map((g) => ({
            category: g.category.trim(),
            words:    g.words.map((w) => w.trim()) as [string, string, string, string],
          })),
        }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setErrorMsg(json.error ?? "Σφάλμα αποστολής.");
        setStatus("idle");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMsg("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={handleClose}>
        <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
          <div className="text-center py-4">
            <p className="text-3xl mb-3">🙏</p>
            <p className="font-semibold text-foreground mb-1">Ευχαριστούμε!</p>
            <p className="text-sm text-muted">Το παζλ σου στάλθηκε για έλεγχο.</p>
            <button onClick={handleClose} className="mt-5 px-6 py-2 rounded-xl bg-inverted text-inverted-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
              Κλείσιμο
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={handleClose}>
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} aria-label="Close" className="absolute top-4 right-4 text-muted hover:text-foreground text-xl leading-none">✕</button>

        <h2 className="text-lg font-bold text-foreground mb-1">Υποβολή Παζλ Leksindeseis</h2>
        <p className="text-xs text-muted mb-5 leading-relaxed">
          Φτιάξε 4 ομάδες από 4 λέξεις. Βάλε τις πιο εύκολες πρώτα.
        </p>

        <div className="space-y-5">
          {groups.map((group, gi) => (
            <div key={gi} className="border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-muted mb-2">{GROUP_HEADERS[gi]}</p>
              <div className="mb-2">
                <label className={labelClass}>Κατηγορία</label>
                <input
                  value={group.category}
                  onChange={(e) => updateCategory(gi, e.target.value)}
                  placeholder="π.χ. Ελληνικοί θεοί"
                  maxLength={60}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {group.words.map((w, wi) => (
                  <input
                    key={wi}
                    value={w}
                    onChange={(e) => updateWord(gi, wi, e.target.value)}
                    placeholder={`Λέξη ${wi + 1}`}
                    maxLength={40}
                    className={inputClass}
                  />
                ))}
              </div>
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

        {errorMsg && (
          <p className="text-xs text-danger mt-2">{errorMsg}</p>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={handleClose} className={btnCancel}>Ακύρωση</button>
          <button onClick={handleSubmit} disabled={status === "submitting"} className={btnModalSubmit}>
            {status === "submitting" ? "…" : "Αποστολή"}
          </button>
        </div>
      </div>
    </div>
  );
}
