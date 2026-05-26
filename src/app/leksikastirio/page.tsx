"use client";

import { Suspense, useCallback, useEffect, useState } from "react";

import { NominationCard, type Nomination } from "@/components/leksikastirio/NominationCard";
import { NominationModal } from "@/components/shared/NominationModal";
import { getOrCreateDeviceId } from "@/hooks/useGameStore";
import { markSuggested } from "@/hooks/suggestions";
import { useSearchParams } from "next/navigation";

type Tab = "add" | "remove";

const tabCopy = {
  add: {
    label:       "Προσθήκη",
    emptyState:  "Δεν υπάρχουν ακόμα προτάσεις για προσθήκη.",
    buttonLabel: "Πρότεινε λέξη",
  },
  remove: {
    label:       "Αφαίρεση",
    emptyState:  "Δεν υπάρχουν ακόμα αναφορές για αφαίρεση.",
    buttonLabel: "Πρότεινε λέξη",
  },
} as const;

function LeksikastiríoClient() {
  const searchParams  = useSearchParams();
  const adminSecret   = searchParams.get("admin") ?? "";
  // Client only checks that the param is present — real validation is server-side (403 on mismatch).
  const isAdmin       = adminSecret.length > 0;
  const deviceId = getOrCreateDeviceId();

  const [activeTab, setActiveTab]       = useState<Tab>("add");
  const [nominations, setNominations]   = useState<Nomination[]>([]);
  const [loading, setLoading]           = useState(true);
  const [votedMap, setVotedMap]         = useState<Map<string, "up" | "down">>(new Map());
  const [modalOpen, setModalOpen]       = useState(false);

  const fetchNominations = useCallback(async (tab: Tab) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/nominations?direction=${tab}`);
      const data = await res.json();
      setNominations(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNominations(activeTab);
  }, [activeTab, fetchNominations]);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setNominations([]);
  }

  function handleVote(id: string, voteType: "up" | "down", action: "added" | "removed" | "switched") {
    setVotedMap((prev) => {
      const next = new Map(prev);
      if (action === "removed") next.delete(id);
      else next.set(id, voteType);
      return next;
    });
    setNominations((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        if (action === "added") {
          return voteType === "up"
            ? { ...n, upvote_count: n.upvote_count + 1 }
            : { ...n, downvote_count: n.downvote_count + 1 };
        }
        if (action === "removed") {
          return voteType === "up"
            ? { ...n, upvote_count: n.upvote_count - 1 }
            : { ...n, downvote_count: n.downvote_count - 1 };
        }
        // switched
        return voteType === "up"
          ? { ...n, upvote_count: n.upvote_count + 1, downvote_count: n.downvote_count - 1 }
          : { ...n, upvote_count: n.upvote_count - 1, downvote_count: n.downvote_count + 1 };
      }),
    );
  }

  function handleReviewed(id: string) {
    setNominations((prev) => prev.filter((n) => n.id !== id));
  }

  function handleNominationSuccess(word: string) {
    if (activeTab === "add") markSuggested(word);
    setModalOpen(false);
    fetchNominations(activeTab);
  }

  const c = tabCopy[activeTab];

  return (
    <div className="flex-1 bg-white">
    <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Λεξικαστήριο</h1>
        <p className="text-sm text-stone-500 mt-1">
          Ψηφίστε λέξεις που πιστεύετε ότι πρέπει να προστεθούν ή να αφαιρεθούν.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        {(["add", "remove"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            data-testid={`tab-${tab}`}
            className={[
              "px-5 py-2.5 text-sm font-semibold transition-colors",
              activeTab === tab
                ? "border-b-2 border-stone-800 text-stone-800"
                : "text-stone-400 hover:text-stone-600",
            ].join(" ")}
          >
            {tabCopy[tab].label}
          </button>
        ))}
      </div>

      {/* Submit button */}
      <div className="flex justify-end">
        <button
          onClick={() => setModalOpen(true)}
          data-testid="open-nomination-modal"
          className="px-4 py-2 rounded-full bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 transition-colors"
        >
          {c.buttonLabel}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-stone-400 text-center py-8">Φόρτωση…</p>
      ) : nominations.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-8">{c.emptyState}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-400 font-semibold uppercase tracking-wide">
                <th className="pb-2 pr-4 font-semibold">Λέξη</th>
                <th className="pb-2 pr-4 font-semibold">Από</th>
                <th className="pb-2 pr-4 font-semibold">Σχόλιο</th>
                <th className="pb-2 pr-4 font-semibold text-center">Ψήφοι</th>
                {isAdmin && <th className="pb-2 font-semibold">Ενέργειες</th>}
              </tr>
            </thead>
            <tbody>
              {nominations.map((nomination) => (
                <NominationCard
                  key={nomination.id}
                  nomination={nomination}
                  myDeviceId={deviceId}
                  currentVote={votedMap.get(nomination.id) ?? null}
                  isAdmin={isAdmin}
                  adminSecret={adminSecret}
                  onVote={handleVote}
                  onReviewed={handleReviewed}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NominationModal
        word=""
        wordEditable
        direction={activeTab}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleNominationSuccess}
      />
    </main>
    </div>
  );
}

export default function LeksikastiríoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-400 text-center py-8">Φόρτωση…</p>}>
      <LeksikastiríoClient />
    </Suspense>
  );
}
