"use client";

import { useState } from "react";

import { btnApprove, btnReject } from "@/styles/recipes";

export interface Nomination {
  id:             string;
  word:           string;
  player_name:    string | null;
  note:           string | null;
  upvote_count:   number;
  downvote_count: number;
  created_at:     string;
  // Set once an admin actions the row this session; drives the status pill.
  status?:        "pending" | "accepted" | "rejected";
}

interface NominationCardProps {
  nomination:   Nomination;
  myDeviceId:   string;
  currentVote:  "up" | "down" | null;
  isAdmin:      boolean;
  adminSecret:  string;
  onVote:       (id: string, voteType: "up" | "down", action: "added" | "removed" | "switched") => void;
  onReviewed:   (id: string, status: "accepted" | "rejected") => void;
}

export function NominationCard({
  nomination,
  myDeviceId,
  currentVote,
  isAdmin,
  adminSecret,
  onVote,
  onReviewed,
}: NominationCardProps) {
  const [voting,      setVoting]      = useState(false);
  const [reviewing,   setReviewing]   = useState(false);
  const [reviewError, setReviewError] = useState(false);

  async function handleVote(voteType: "up" | "down") {
    if (voting) return;
    setVoting(true);
    try {
      const res  = await fetch(`/api/nominations/${nomination.id}/vote`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ deviceId: myDeviceId, voteType }),
      });
      const data = await res.json() as { action: "added" | "removed" | "switched" };
      onVote(nomination.id, voteType, data.action);
    } finally {
      setVoting(false);
    }
  }

  async function handleReview(action: "approve" | "reject") {
    if (reviewing) return;
    setReviewing(true);
    setReviewError(false);
    try {
      const res = await fetch(`/api/nominations/${nomination.id}/review`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, adminSecret }),
      });
      // Only reflect success if the server actually persisted the change —
      // otherwise the row stays pending and the admin needs to know it failed.
      if (!res.ok) {
        setReviewError(true);
        return;
      }
      onReviewed(nomination.id, action === "approve" ? "accepted" : "rejected");
    } catch {
      setReviewError(true);
    } finally {
      setReviewing(false);
    }
  }

  return (
    <tr
      data-testid="nomination-card"
      className="border-b border-border last:border-0 align-top"
    >
      <td className="py-3 pr-4 font-bold text-foreground uppercase tracking-wide whitespace-nowrap">
        {nomination.word}
      </td>

      <td className="py-3 pr-4 text-xs text-muted whitespace-nowrap">
        {nomination.player_name ?? "—"}
      </td>

      <td className="py-3 pr-4 text-sm text-muted leading-relaxed max-w-md break-words">
        {nomination.note ?? ""}
      </td>

      <td className="py-3 pr-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleVote("up")}
            disabled={voting}
            data-testid="vote-up-button"
            aria-label="Υπέρ"
            className={[
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition-colors",
              currentVote === "up"
                ? "bg-correct/15 text-correct"
                : "bg-surface-raised text-muted hover:bg-correct/15 hover:text-correct",
            ].join(" ")}
          >
            ▲ {nomination.upvote_count}
          </button>
          <button
            onClick={() => handleVote("down")}
            disabled={voting}
            data-testid="vote-down-button"
            aria-label="Κατά"
            className={[
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition-colors",
              currentVote === "down"
                ? "bg-danger/15 text-danger"
                : "bg-surface-raised text-muted hover:bg-danger/15 hover:text-danger",
            ].join(" ")}
          >
            ▼ {nomination.downvote_count}
          </button>
        </div>
      </td>

      {isAdmin && (
        <td className="py-3 pl-2 sticky right-0 bg-background">
          {nomination.status === "accepted" || nomination.status === "rejected" ? (
            <span
              data-testid="admin-status"
              className={[
                "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap",
                nomination.status === "accepted"
                  ? "bg-correct/15 text-correct"
                  : "bg-danger/15 text-danger",
              ].join(" ")}
            >
              {nomination.status === "accepted" ? "✓ Εγκρίθηκε" : "✕ Απορρίφθηκε"}
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleReview("approve")}
                disabled={reviewing}
                data-testid="admin-approve"
                aria-label="Έγκριση"
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold ${btnApprove}`}
              >
                ✓
              </button>
              <button
                onClick={() => handleReview("reject")}
                disabled={reviewing}
                data-testid="admin-reject"
                aria-label="Απόρριψη"
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold ${btnReject}`}
              >
                ✕
              </button>
              {reviewError && (
                <span
                  data-testid="admin-error"
                  title="Η ενέργεια απέτυχε — ελέγξτε το admin secret"
                  className="text-xs text-danger whitespace-nowrap ml-1"
                >
                  ⚠ Σφάλμα
                </span>
              )}
            </div>
          )}
        </td>
      )}
    </tr>
  );
}
