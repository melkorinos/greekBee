"use client";

// Λεξόπλεγμα page client — header, HowToPlay, and the board.
// No clock in this game, so modals never need to pause anything.

import { useState } from "react";

import type { LeksoplegmaPuzzle } from "@/games/leksoplegma/types";

import { HowToPlayModal } from "./HowToPlayModal";
import { LeksoplegmaBoard } from "./LeksoplegmaBoard";

interface LeksoplegmaPageClientProps {
  puzzle: LeksoplegmaPuzzle;
  today:  string;
}

export function LeksoplegmaPageClient({ puzzle, today }: LeksoplegmaPageClientProps) {
  const [lbOpen,  setLbOpen]  = useState(false);
  const [htpOpen, setHtpOpen] = useState(false);

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          🕸️ Λεξόπλεγμα
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLbOpen(true)}
            className="text-muted hover:text-foreground transition-colors text-trophy"
            aria-label="Πίνακας σκορ"
            title="Πίνακας σκορ"
          >
            🏆
          </button>
          <button
            onClick={() => setHtpOpen(true)}
            aria-label="Πώς να παίξεις"
            className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted text-sm font-bold hover:bg-surface-raised transition-colors"
          >
            ?
          </button>
        </div>
      </div>

      <LeksoplegmaBoard
        puzzle={puzzle}
        today={today}
        isLeaderboardOpen={lbOpen}
        onOpenLeaderboard={() => setLbOpen(true)}
        onCloseLeaderboard={() => setLbOpen(false)}
      />

      <HowToPlayModal isOpen={htpOpen} onClose={() => setHtpOpen(false)} />
    </>
  );
}
