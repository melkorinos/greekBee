"use client";

import { VresTinFrasiBoard } from "./VresTinFrasiBoard";
import { HowToPlayModal } from "./HowToPlayModal";
import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";
import { useState } from "react";

interface VresTinFrasiPageClientProps {
  puzzle:     VresTinFrasiPuzzle;
  validWords: string[];
  today:      string;
}

export function VresTinFrasiPageClient({
  puzzle,
  validWords,
  today,
}: VresTinFrasiPageClientProps) {
  const [lbOpen,  setLbOpen]  = useState(false);
  const [htpOpen, setHtpOpen] = useState(false);

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          💬 Vres Tin Frasi
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
          <div className="relative group">
            <button
              onClick={() => setHtpOpen(true)}
              aria-label="Πώς να παίξεις"
              className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted text-sm font-bold hover:bg-surface-raised transition-colors"
            >
              ?
            </button>
            <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-inverted px-2.5 py-1 text-xs text-inverted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10">
              Κανόνες
            </div>
          </div>
        </div>
      </div>

      <VresTinFrasiBoard
        puzzle={puzzle}
        validWords={validWords}
        today={today}
        isLeaderboardOpen={lbOpen}
        onOpenLeaderboard={() => setLbOpen(true)}
        onCloseLeaderboard={() => setLbOpen(false)}
      />

      <HowToPlayModal isOpen={htpOpen} onClose={() => setHtpOpen(false)} />
    </>
  );
}
