"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";

import { NominationCard, type Nomination } from "@/components/leksikastirio/NominationCard";
import { NominationModal } from "@/components/shared/NominationModal";
import { GameHeader } from "@/components/shared/GameHeader";
import { getOrCreateDeviceId } from "@/hooks/useGameStore";
import { markSuggested } from "@/hooks/suggestions";
import { btnApprove, btnPrimary, btnReject } from "@/styles/recipes";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// ── Tab types ─────────────────────────────────────────────────────────────────

type NominationTab = "add" | "remove";
type CommunityTab  = "leksindeseis" | "stavrolekso";
type Tab           = NominationTab | CommunityTab;

function isNominationTab(t: Tab): t is NominationTab {
  return t === "add" || t === "remove";
}

// ── Community puzzle types ────────────────────────────────────────────────────

interface LeksindeseisCommunityPuzzle {
  id: number;
  submitter_name: string;
  data: Array<{ category: string; words: [string, string, string, string]; difficulty: number }>;
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
  leksindeseis: { label: "Παζλ Leksindeseis",     emptyState: "Δεν υπάρχουν παζλ σε αναμονή." },
  stavrolekso:  { label: "Παζλ Stavrolekso",       emptyState: "Δεν υπάρχουν παζλ σε αναμονή." },
} as const;

// ── Community queue card ──────────────────────────────────────────────────────
// One shell owning the admin verb of the Community Puzzle Lifecycle — review a
// pending Community Puzzle — for every queue. Per-game variation enters as a
// body renderer (the QUEUE_BODY registry below), the same shape the lifecycle
// itself uses server-side: shared machine, per-game config at the seam. The
// admin wire (URL shape, X-Admin-Secret, PATCH body) is stated once, here.

function SubmitterLine({ name }: { name: string }) {
  if (!name) return null;
  return <p className="text-xs text-muted">από {name}</p>;
}

function CommunityQueueCard({
  game,
  puzzleId,
  adminSecret,
  onReviewed,
  children,
}: {
  game:        CommunityTab;
  puzzleId:    number;
  adminSecret: string;
  onReviewed:  (id: number) => void;
  /** The per-game body — everything above the approve/reject row. */
  children:    React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  async function review(action: "approve" | "reject") {
    setBusy(true);
    await fetch(`/api/community-puzzles/${game}/${puzzleId}/review`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": adminSecret },
      body:    JSON.stringify({ action }),
    });
    onReviewed(puzzleId);
  }

  return (
    <div className="border border-border rounded-xl p-4 space-y-2" data-testid="community-queue-card">
      {children}
      <div className="flex gap-2 pt-1">
        <button
          disabled={busy}
          onClick={() => review("approve")}
          data-testid="community-approve"
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${btnApprove}`}
        >
          Έγκριση
        </button>
        <button
          disabled={busy}
          onClick={() => review("reject")}
          data-testid="community-reject"
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${btnReject}`}
        >
          Απόρριψη
        </button>
      </div>
    </div>
  );
}

// ── Per-game bodies ───────────────────────────────────────────────────────────

function LeksindeseisBody({ puzzle }: { puzzle: LeksindeseisCommunityPuzzle }) {
  return (
    <>
      <SubmitterLine name={puzzle.submitter_name} />
      <div className="space-y-2">
        {puzzle.data.map((group, i) => (
          <div key={i} className="bg-surface-raised rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-muted mb-1">{group.category}</p>
            <p className="text-xs text-muted">{group.words.join(", ")}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function StavroleksoBody({ puzzle }: { puzzle: StavroleksoCommunityPuzzle }) {
  const slotCount = puzzle.data.slots.length;
  const created   = new Date(puzzle.created_at).toLocaleDateString("el-GR");

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          {puzzle.title && (
            <p className="text-sm font-semibold text-foreground">{puzzle.title}</p>
          )}
          <p className="text-xs text-muted">
            {puzzle.data.width}×{puzzle.data.height} · {slotCount} slots · {created}
          </p>
          <SubmitterLine name={puzzle.submitter_name} />
        </div>
      </div>
      <pre className="text-[10px] text-muted bg-surface rounded-lg p-2 overflow-x-auto max-h-40">
        {JSON.stringify(puzzle.data, null, 2)}
      </pre>
    </>
  );
}

// ── Body registry ─────────────────────────────────────────────────────────────
// The cast is the seam's cost: the page holds its queues as unknown[] (one
// QueueMap for every row shape), so each body re-states the shape it was
// registered for. Wrong shape → runtime, not compile — the same trade the
// lifecycle's validate() adapters make server-side.

const QUEUE_BODY: Record<CommunityTab, (puzzle: unknown) => React.ReactNode> = {
  leksindeseis: (p) => <LeksindeseisBody puzzle={p as LeksindeseisCommunityPuzzle} />,
  stavrolekso:  (p) => <StavroleksoBody  puzzle={p as StavroleksoCommunityPuzzle} />,
};

// Rank by net score (upvotes − downvotes), highest first. The score itself is
// never shown — it only orders the list. Ties keep their incoming order (the API
// pre-sorts by net score then created_at desc), and JS's stable sort preserves it.
function byNetScoreDesc(a: Nomination, b: Nomination): number {
  return (b.upvote_count - b.downvote_count) - (a.upvote_count - a.downvote_count);
}

// ── Main client component ─────────────────────────────────────────────────────

function LeksikastiríoClient() {
  const searchParams = useSearchParams();
  // Admin unlock accepts either ?admin=<secret> or the shared ?godmode=<secret>,
  // so the same URL param (?godmode=zzkdgr3) works here and in Leksokipos god mode.
  // The value is still validated server-side against ADMIN_SECRET, which must be
  // set to that shared secret for review actions to succeed.
  const adminSecret  = searchParams.get("admin") ?? searchParams.get("godmode") ?? "";
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
      const res  = await fetch(`/api/nominations?direction=${tab}&deviceId=${encodeURIComponent(deviceId)}`);
      const data = await res.json();
      const list = (Array.isArray(data) ? data : []) as Nomination[];
      setNominations(list);
      // Hydrate the voted map from the server so votes cast in a previous session
      // stay highlighted — otherwise the map starts empty on every page load.
      const hydrated = new Map<string, "up" | "down">();
      for (const n of list) {
        if (n.my_vote === "up" || n.my_vote === "down") hydrated.set(n.id, n.my_vote);
      }
      setVotedMap(hydrated);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

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

  function handleReviewed(id: string, status: "accepted" | "rejected") {
    // Keep the row visible and stamp its status — the card swaps its approve/
    // reject buttons for a status pill so the admin sees the result. The row
    // clears on the next refetch (GET returns pending only).
    setNominations((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status } : n)),
    );
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
    const game  = activeTab as CommunityTab;
    const queue = queues[game] ?? [];
    const copy  = communityTabCopy[game];
    if (queue.length === 0) {
      return (
        <p className="text-sm text-muted text-center py-8">{copy.emptyState}</p>
      );
    }
    return (
      <div className="space-y-4">
        {queue.map((p: unknown) => {
          const id = (p as { id: number }).id;
          return (
            <CommunityQueueCard
              key={id}
              game={game}
              puzzleId={id}
              adminSecret={adminSecret}
              onReviewed={(reviewedId) => handleCommunityReviewed(reviewedId, game)}
            >
              {QUEUE_BODY[game](p)}
            </CommunityQueueCard>
          );
        })}
      </div>
    );
  }

  const nominationTabs: NominationTab[] = ["add", "remove"];
  const communityTabs: CommunityTab[]   = ["leksindeseis", "stavrolekso"];

  return (
    <div data-game="leksikastirio" className="flex-1 bg-background">
    {/* Admins review from a desktop — give them the full HD width; players keep the narrow mobile column. */}
    <main className={`${isAdmin ? "max-w-6xl" : "max-w-lg"} mx-auto px-4 py-8 space-y-6`}>
      <div>
        <GameHeader title="⚖️ Leksikastirio" />
        <p className="text-sm text-muted mt-1">
          Ψηφίστε λέξεις που πιστεύετε ότι πρέπει να προστεθούν ή να αφαιρεθούν.
        </p>
        {isAdmin && (
          <Link
            href="/leksokipos?godmode=zzkdgr3"
            className="inline-block mt-2 text-xs text-muted hover:text-foreground underline underline-offset-2"
          >
            🧪 Leksokipos God Mode
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-wrap">
        {nominationTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            data-testid={`tab-${tab}`}
            className={[
              "px-5 py-2.5 text-sm font-semibold transition-colors",
              activeTab === tab
                ? "border-b-2 border-inverted text-foreground"
                : "text-muted hover:text-foreground",
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
                ? "border-b-2 border-inverted text-foreground"
                : "text-muted hover:text-foreground",
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
            className={btnPrimary}
          >
            {nominationTabCopy[activeTab].buttonLabel}
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="text-sm text-muted text-center py-8">Φόρτωση…</p>
      ) : isNominationTab(activeTab) ? (
        nominations.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">{nominationTabCopy[activeTab].emptyState}</p>
        ) : (
          // A plain list, not a table: each card owns its own responsive grid, so
          // it stacks on a phone (votes beside the word) and lines up into
          // columns from `sm:` up. There is no header row — every cell already
          // labels itself («από …», ▲/▼) and a header would be a second copy of
          // the card's grid template to keep in sync.
          <ul className="w-full text-sm">
            {[...nominations].sort(byNetScoreDesc).map((nomination) => (
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
          </ul>
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
    <Suspense fallback={<p className="text-sm text-muted text-center py-8">Φόρτωση…</p>}>
      <LeksikastiríoClient />
    </Suspense>
  );
}
