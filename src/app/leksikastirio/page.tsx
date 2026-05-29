"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";

import { NominationCard, type Nomination } from "@/components/leksikastirio/NominationCard";
import { NominationModal } from "@/components/shared/NominationModal";
import { getOrCreateDeviceId } from "@/hooks/useGameStore";
import { markSuggested } from "@/hooks/suggestions";
import { useSearchParams } from "next/navigation";

// ── Tab types ─────────────────────────────────────────────────────────────────

type NominationTab = "add" | "remove";
type CommunityTab  = "leksiarxeio" | "leksindeseis" | "vrestifrasi" | "stavrolekso";
type Tab           = NominationTab | CommunityTab;

function isNominationTab(t: Tab): t is NominationTab {
  return t === "add" || t === "remove";
}

// ── Community puzzle types ────────────────────────────────────────────────────

interface LeksiarxeioCommunityPuzzle {
  id: number;
  submitter_name: string;
  data: Record<string, string>;
  created_at: string;
}

interface LeksindeseisCommunityPuzzle {
  id: number;
  submitter_name: string;
  data: Array<{ category: string; words: [string, string, string, string]; difficulty: number }>;
  created_at: string;
}

interface VresTinFrasiCommunityPuzzle {
  id: number;
  submitter_name: string;
  data: { phrase: string };
  created_at: string;
}

interface StavroleksoCommunityPuzzle {
  id: number;
  title: string | null;
  submitter_name: string;
  data: { width: number; height: number; blackSquares: [number, number][]; slots: unknown[] };
  created_at: string;
}

// ── Static copy ───────────────────────────────────────────────────────────────

const nominationTabCopy = {
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

const communityTabCopy = {
  leksiarxeio:  { label: "Παζλ Leksiarxeio",      emptyState: "Δεν υπάρχουν παζλ σε αναμονή." },
  leksindeseis: { label: "Παζλ Leksindeseis",     emptyState: "Δεν υπάρχουν παζλ σε αναμονή." },
  vrestifrasi:  { label: "Φράσεις Vres Tin Frasi", emptyState: "Δεν υπάρχουν φράσεις σε αναμονή." },
  stavrolekso:  { label: "Παζλ Stavrolekso",       emptyState: "Δεν υπάρχουν παζλ σε αναμονή." },
} as const;

// ── Community puzzle cards ────────────────────────────────────────────────────

function LeksiarxeioQueueCard({
  puzzle,
  adminSecret,
  onReviewed,
}: {
  puzzle: LeksiarxeioCommunityPuzzle;
  adminSecret: string;
  onReviewed: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function review(action: "approve" | "reject") {
    setBusy(true);
    await fetch(`/api/community-puzzles/leksiarxeio/${puzzle.id}/review`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": adminSecret },
      body:    JSON.stringify({ action }),
    });
    onReviewed(puzzle.id);
  }

  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 space-y-2">
      {puzzle.submitter_name && (
        <p className="text-xs text-stone-400 dark:text-stone-500">από {puzzle.submitter_name}</p>
      )}
      <div className="grid grid-cols-5 gap-1">
        {[4, 5, 6, 7, 8].map((len) => (
          <div key={len} className="text-center">
            <p className="text-xs text-stone-400">{len}γρ</p>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">{puzzle.data[String(len)]}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          disabled={busy}
          onClick={() => review("approve")}
          className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Έγκριση
        </button>
        <button
          disabled={busy}
          onClick={() => review("reject")}
          className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Απόρριψη
        </button>
      </div>
    </div>
  );
}

function VresTinFrasiQueueCard({
  puzzle,
  adminSecret,
  onReviewed,
}: {
  puzzle: VresTinFrasiCommunityPuzzle;
  adminSecret: string;
  onReviewed: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function review(action: "approve" | "reject") {
    setBusy(true);
    await fetch(`/api/community-puzzles/vrestifrasi/${puzzle.id}/review`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": adminSecret },
      body:    JSON.stringify({ action }),
    });
    onReviewed(puzzle.id);
  }

  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 space-y-2">
      {puzzle.submitter_name && (
        <p className="text-xs text-stone-400 dark:text-stone-500">από {puzzle.submitter_name}</p>
      )}
      <p className="text-base font-semibold text-stone-700 dark:text-stone-200">{puzzle.data.phrase}</p>
      <div className="flex gap-2 pt-1">
        <button
          disabled={busy}
          onClick={() => review("approve")}
          className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Έγκριση
        </button>
        <button
          disabled={busy}
          onClick={() => review("reject")}
          className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Απόρριψη
        </button>
      </div>
    </div>
  );
}

function LeksindeseisQueueCard({
  puzzle,
  adminSecret,
  onReviewed,
}: {
  puzzle: LeksindeseisCommunityPuzzle;
  adminSecret: string;
  onReviewed: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function review(action: "approve" | "reject") {
    setBusy(true);
    await fetch(`/api/community-puzzles/leksindeseis/${puzzle.id}/review`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": adminSecret },
      body:    JSON.stringify({ action }),
    });
    onReviewed(puzzle.id);
  }

  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 space-y-2">
      {puzzle.submitter_name && (
        <p className="text-xs text-stone-400 dark:text-stone-500">από {puzzle.submitter_name}</p>
      )}
      <div className="space-y-2">
        {puzzle.data.map((group, i) => (
          <div key={i} className="bg-stone-50 dark:bg-stone-800 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">{group.category}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">{group.words.join(", ")}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          disabled={busy}
          onClick={() => review("approve")}
          className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Έγκριση
        </button>
        <button
          disabled={busy}
          onClick={() => review("reject")}
          className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Απόρριψη
        </button>
      </div>
    </div>
  );
}

function StavroleksoQueueCard({
  puzzle,
  adminSecret,
  onReviewed,
}: {
  puzzle: StavroleksoCommunityPuzzle;
  adminSecret: string;
  onReviewed: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function review(action: "approve" | "reject") {
    setBusy(true);
    await fetch(`/api/community-puzzles/stavrolekso/${puzzle.id}/review`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": adminSecret },
      body:    JSON.stringify({ action }),
    });
    onReviewed(puzzle.id);
  }

  const slotCount  = puzzle.data.slots.length;
  const created    = new Date(puzzle.created_at).toLocaleDateString("el-GR");

  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          {puzzle.title && (
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">{puzzle.title}</p>
          )}
          <p className="text-xs text-stone-400 dark:text-stone-500">
            {puzzle.data.width}×{puzzle.data.height} · {slotCount} slots · {created}
          </p>
          {puzzle.submitter_name && (
            <p className="text-xs text-stone-400 dark:text-stone-500">από {puzzle.submitter_name}</p>
          )}
        </div>
      </div>
      <pre className="text-[10px] text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-900 rounded-lg p-2 overflow-x-auto max-h-40">
        {JSON.stringify(puzzle.data, null, 2)}
      </pre>
      <div className="flex gap-2 pt-1">
        <button
          disabled={busy}
          onClick={() => review("approve")}
          className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Έγκριση
        </button>
        <button
          disabled={busy}
          onClick={() => review("reject")}
          className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Απόρριψη
        </button>
      </div>
    </div>
  );
}

// ── Card registry ─────────────────────────────────────────────────────────────

type CardRenderer = (
  puzzle:      unknown,
  adminSecret: string,
  onReviewed:  (id: number) => void,
) => React.ReactNode;

const CARD: Record<CommunityTab, CardRenderer> = {
  leksiarxeio:  (p, as, or) => <LeksiarxeioQueueCard  puzzle={p as LeksiarxeioCommunityPuzzle}  adminSecret={as} onReviewed={or} />,
  leksindeseis: (p, as, or) => <LeksindeseisQueueCard puzzle={p as LeksindeseisCommunityPuzzle} adminSecret={as} onReviewed={or} />,
  vrestifrasi:  (p, as, or) => <VresTinFrasiQueueCard  puzzle={p as VresTinFrasiCommunityPuzzle}  adminSecret={as} onReviewed={or} />,
  stavrolekso:  (p, as, or) => <StavroleksoQueueCard  puzzle={p as StavroleksoCommunityPuzzle}  adminSecret={as} onReviewed={or} />,
};

// ── Main client component ─────────────────────────────────────────────────────

function LeksikastiríoClient() {
  const searchParams = useSearchParams();
  const adminSecret  = searchParams.get("admin") ?? "";
  const isAdmin      = adminSecret.length > 0;
  const deviceId     = getOrCreateDeviceId();

  const [activeTab, setActiveTab]     = useState<Tab>("add");
  const [nominations, setNominations] = useState<Nomination[]>([]);
  type QueueMap = Partial<Record<CommunityTab, unknown[]>>;
  const [queues, setQueues]           = useState<QueueMap>({});
  const [loading, setLoading]         = useState(true);
  const [votedMap, setVotedMap]       = useState<Map<string, "up" | "down">>(new Map());
  const [modalOpen, setModalOpen]     = useState(false);

  const fetchNominations = useCallback(async (tab: NominationTab) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/nominations?direction=${tab}`);
      const data = await res.json();
      setNominations(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCommunityPuzzles = useCallback(async (game: CommunityTab) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/community-puzzles/${game}?status=pending`, {
        headers: { "X-Admin-Secret": adminSecret },
      });
      const data = await res.json() as { puzzles: unknown[] };
      setQueues(prev => ({ ...prev, [game]: data.puzzles ?? [] }));
    } finally {
      setLoading(false);
    }
  }, [adminSecret]);

  useEffect(() => {
    if (isNominationTab(activeTab)) {
      fetchNominations(activeTab);
    } else {
      fetchCommunityPuzzles(activeTab);
    }
  }, [activeTab, fetchNominations, fetchCommunityPuzzles]);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (isNominationTab(tab)) setNominations([]);
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
        return voteType === "up"
          ? { ...n, upvote_count: n.upvote_count + 1, downvote_count: n.downvote_count - 1 }
          : { ...n, upvote_count: n.upvote_count - 1, downvote_count: n.downvote_count + 1 };
      }),
    );
  }

  function handleReviewed(id: string) {
    setNominations((prev) => prev.filter((n) => n.id !== id));
  }

  function handleCommunityReviewed(id: number, game: CommunityTab) {
    setQueues(prev => ({
      ...prev,
      [game]: (prev[game] ?? []).filter((p) => (p as { id: number }).id !== id),
    }));
  }

  function handleNominationSuccess(word: string) {
    if (activeTab === "add") markSuggested(word);
    setModalOpen(false);
    if (isNominationTab(activeTab)) fetchNominations(activeTab);
  }

  function renderCommunityTab() {
    const queue = queues[activeTab as CommunityTab] ?? [];
    const copy  = communityTabCopy[activeTab as CommunityTab];
    if (queue.length === 0) {
      return (
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">{copy.emptyState}</p>
      );
    }
    return (
      <div className="space-y-4">
        {queue.map((p: unknown) => (
          <React.Fragment key={(p as { id: number }).id}>
            {CARD[activeTab as CommunityTab](p, adminSecret, (id) => handleCommunityReviewed(id, activeTab as CommunityTab))}
          </React.Fragment>
        ))}
      </div>
    );
  }

  const nominationTabs: NominationTab[] = ["add", "remove"];
  const communityTabs: CommunityTab[]   = ["leksiarxeio", "leksindeseis", "vrestifrasi", "stavrolekso"];

  return (
    <div className="flex-1 bg-white dark:bg-stone-950">
    <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Leksikastirio</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Ψηφίστε λέξεις που πιστεύετε ότι πρέπει να προστεθούν ή να αφαιρεθούν.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 flex-wrap">
        {nominationTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            data-testid={`tab-${tab}`}
            className={[
              "px-5 py-2.5 text-sm font-semibold transition-colors",
              activeTab === tab
                ? "border-b-2 border-stone-800 dark:border-stone-300 text-stone-800 dark:text-stone-100"
                : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300",
            ].join(" ")}
          >
            {nominationTabCopy[tab].label}
          </button>
        ))}
        {isAdmin && communityTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            data-testid={`tab-${tab}`}
            className={[
              "px-5 py-2.5 text-sm font-semibold transition-colors",
              activeTab === tab
                ? "border-b-2 border-stone-800 dark:border-stone-300 text-stone-800 dark:text-stone-100"
                : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300",
            ].join(" ")}
          >
            {communityTabCopy[tab].label}
          </button>
        ))}
      </div>

      {/* Submit button — nomination tabs only */}
      {isNominationTab(activeTab) && (
        <div className="flex justify-end">
          <button
            onClick={() => setModalOpen(true)}
            data-testid="open-nomination-modal"
            className="px-4 py-2 rounded-full bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-700 dark:hover:bg-stone-100 transition-colors"
          >
            {nominationTabCopy[activeTab].buttonLabel}
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">Φόρτωση…</p>
      ) : isNominationTab(activeTab) ? (
        nominations.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">{nominationTabCopy[activeTab].emptyState}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-left text-xs text-stone-400 dark:text-stone-500 font-semibold uppercase tracking-wide">
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
        )
      ) : (
        renderCommunityTab()
      )}

      {isNominationTab(activeTab) && (
        <NominationModal
          word=""
          wordEditable
          direction={activeTab}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleNominationSuccess}
        />
      )}
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
