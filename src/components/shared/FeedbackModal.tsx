"use client";

// FeedbackModal — the platform Feedback surface (see CONTEXT.md "Feedback").
// Free-text message delivered to the maintainer by email via FormSubmit (AJAX
// endpoint → stays on page, JSON response). Not persisted server-side. Opened
// from the Shell hamburger drawer.
//
// MVP is text-only; screenshot attachment is deferred (FormSubmit's AJAX
// endpoint doesn't accept file uploads, and email attachments are a paid
// feature on the alternatives).

import { btnCancel, btnModalPrimary, btnModalSubmit, inputClass, labelClass } from "@/styles/recipes";

import { Modal } from "./Modal";
import { getOrCreateDeviceId } from "@/hooks/useGameStore";
import { useEffect, useRef, useState } from "react";

interface FeedbackModalProps {
  isOpen:  boolean;
  onClose: () => void;
}

// The recipient id (email, or a FormSubmit hashed alias to keep the raw email out
// of the client bundle). Config, not hardcoded — see .env.local.example.
const FORMSUBMIT_ID  = process.env.NEXT_PUBLIC_FORMSUBMIT_ID ?? "";
const FORMSUBMIT_URL = `https://formsubmit.co/ajax/${FORMSUBMIT_ID}`;
const THROTTLE_MS    = 60_000;              // one submit per minute
const LAST_SENT_KEY  = "feedback:lastSentAt";

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState("");
  const [status,  setStatus]  = useState<"idle" | "submitting" | "success" | "error" | "throttled">("idle");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-close a moment after success so the player isn't left on the thank-you.
  useEffect(() => {
    if (status !== "success") return;
    closeTimer.current = setTimeout(() => handleClose(), 2500);
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
    // handleClose is stable enough for this one-shot; deps intentionally minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (!isOpen) return null;

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) return;

    // Client-side throttle: one send per minute (matches the platform's
    // accept-the-risk stance on abuse — no server rate limiting).
    const last = Number(localStorage.getItem(LAST_SENT_KEY) ?? 0);
    if (Date.now() - last < THROTTLE_MS) {
      setStatus("throttled");
      return;
    }

    setStatus("submitting");
    try {
      const form = new FormData();
      form.append("message",     trimmed);
      form.append("_subject",    "Leksarxeia — Σχόλιο παίκτη");
      form.append("_captcha",    "false");
      form.append("page_url",    typeof window !== "undefined" ? window.location.href : "");
      form.append("user_agent",  typeof navigator !== "undefined" ? navigator.userAgent : "");
      form.append("device_id",   getOrCreateDeviceId());

      const res = await fetch(FORMSUBMIT_URL, {
        method:  "POST",
        headers: { Accept: "application/json" },
        body:    form,
      });
      if (!res.ok) throw new Error("server error");
      localStorage.setItem(LAST_SENT_KEY, String(Date.now()));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMessage("");
    setStatus("idle");
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeLabel="Κλείσιμο"
      backdropTestId="feedback-modal-backdrop"
      cardTestId="feedback-modal"
      closeTestId="feedback-modal-close"
    >
      {status === "success" ? (
        <div className="text-center py-4" data-testid="feedback-modal-success">
          <p className="text-3xl mb-3">🙏</p>
          <p className="font-semibold text-foreground mb-1">Ευχαριστούμε!</p>
          <p className="text-sm text-muted">Το σχόλιό σου στάλθηκε.</p>
          <button onClick={handleClose} className={`mt-5 ${btnModalPrimary}`}>
            Κλείσιμο
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-bold text-foreground mb-1">Στείλε μας σχόλιο</h2>
          <p className="text-xs text-muted mb-5 leading-relaxed">
            Βρήκες κάποιο πρόβλημα ή έχεις μια ιδέα; Γράψε μας δυο λόγια.
          </p>

          <div>
            <label className={labelClass}>Μήνυμα</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="π.χ. το κουμπί αποστολής δεν δουλεύει στο κινητό…"
              maxLength={1000}
              rows={4}
              data-testid="feedback-modal-message"
              className={`${inputClass} resize-none`}
            />
          </div>

          {status === "error" && (
            <p className="text-xs text-danger mt-2" data-testid="feedback-modal-error">
              Κάτι πήγε στραβά. Δοκίμασε ξανά.
            </p>
          )}

          {status === "throttled" && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2" data-testid="feedback-modal-throttled">
              Μόλις έστειλες σχόλιο. Περίμενε ένα λεπτό πριν στείλεις ξανά.
            </p>
          )}

          <div className="flex gap-2 mt-5">
            <button onClick={handleClose} data-testid="feedback-modal-cancel" className={btnCancel}>
              Ακύρωση
            </button>
            <button
              onClick={handleSubmit}
              disabled={status === "submitting" || !message.trim()}
              data-testid="feedback-modal-submit"
              className={`flex-1 ${btnModalSubmit}`}
            >
              {status === "submitting" ? "…" : "Αποστολή"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
