"use client";

import { useState } from "react";

export interface Nomination {
  id:          string;
  word:        string;
  player_name: string | null;
  note:        string | null;
  vote_count:  number;
  created_at:  string;
}

interface NominationCardProps {
  nomination:  Nomination;
  myDeviceId:  string;
  hasVoted:    boolean;
  isAdmin:     boolean;
  adminSecret: string;
  onVote:      (id: string) => void;
  onReviewed:  (id: string) => void;
}

export function NominationCard({
  nomination,
  myDeviceId,
  hasVoted,
  isAdmin,
  adminSecret,
  onVote,
  onReviewed,
}: NominationCardProps) {
  const [voting,    setVoting]    = useState(false);
  const [reviewing, setReviewing] = useState(false);

  async function handleVote() {
    if (hasVoted || voting) return;
    setVoting(true);
    try {
      await fetch(`/api/nominations/${nomination.id}/vote`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ deviceId: myDeviceId }),
      });
      onVote(nomination.id);
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
    <div
      data-testid="nomination-card"
      className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 space-y-2"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-lg font-bold text-stone-800 uppercase tracking-wide">
          {nomination.word}
        </span>

        <button
          onClick={handleVote}
          disabled={hasVoted || voting}
          data-testid="vote-button"
          aria-label="Ψηφίστε αυτή την πρόταση"
          className={[
            "flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full transition-colors",
            hasVoted
              ? "bg-yellow-100 text-yellow-700 cursor-default"
              : "bg-stone-100 text-stone-600 hover:bg-yellow-100 hover:text-yellow-700",
          ].join(" ")}
        >
          <span>{hasVoted ? "★" : "☆"}</span>
          <span>{nomination.vote_count}</span>
        </button>
      </div>

      {nomination.player_name && (
        <p className="text-xs text-stone-400">από {nomination.player_name}</p>
      )}

      {nomination.note && (
        <p className="text-sm text-stone-600 leading-relaxed">{nomination.note}</p>
      )}

      {isAdmin && (
        <div className="flex gap-2 pt-2 border-t border-stone-100">
          <button
            onClick={() => handleReview("approve")}
            disabled={reviewing}
            data-testid="admin-approve"
            className="flex-1 py-1.5 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Έγκριση
          </button>
          <button
            onClick={() => handleReview("reject")}
            disabled={reviewing}
            data-testid="admin-reject"
            className="flex-1 py-1.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            Απόρριψη
          </button>
        </div>
      )}
    </div>
  );
}
