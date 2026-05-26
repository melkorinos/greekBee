"use client";

import { useState } from "react";

export interface Nomination {
  id:             string;
  word:           string;
  player_name:    string | null;
  note:           string | null;
  upvote_count:   number;
  downvote_count: number;
  created_at:     string;
}

interface NominationCardProps {
  nomination:   Nomination;
  myDeviceId:   string;
  currentVote:  "up" | "down" | null;
  isAdmin:      boolean;
  adminSecret:  string;
  onVote:       (id: string, voteType: "up" | "down", action: "added" | "removed" | "switched") => void;
  onReviewed:   (id: string) => void;
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
  const [voting,    setVoting]    = useState(false);
  const [reviewing, setReviewing] = useState(false);

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
    try {
      await fetch(`/api/nominations/${nomination.id}/review`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, adminSecret }),
      });
      onReviewed(nomination.id);
    } finally {
      setReviewing(false);
    }
  }

  return (
    <tr
      data-testid="nomination-card"
      className="border-b border-stone-100 last:border-0 align-top"
    >
      <td className="py-3 pr-4 font-bold text-stone-800 uppercase tracking-wide whitespace-nowrap">
        {nomination.word}
      </td>

      <td className="py-3 pr-4 text-xs text-stone-400 whitespace-nowrap">
        {nomination.player_name ?? "—"}
      </td>

      <td className="py-3 pr-4 text-sm text-stone-600 leading-relaxed">
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
                ? "bg-green-100 text-green-700"
                : "bg-stone-100 text-stone-500 hover:bg-green-100 hover:text-green-700",
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
                ? "bg-red-100 text-red-600"
                : "bg-stone-100 text-stone-500 hover:bg-red-100 hover:text-red-600",
            ].join(" ")}
          >
            ▼ {nomination.downvote_count}
          </button>
        </div>
      </td>

      {isAdmin && (
        <td className="py-3">
          <div className="flex gap-1">
            <button
              onClick={() => handleReview("approve")}
              disabled={reviewing}
              data-testid="admin-approve"
              className="px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Έγκριση
            </button>
            <button
              onClick={() => handleReview("reject")}
              disabled={reviewing}
              data-testid="admin-reject"
              className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              Απόρριψη
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
