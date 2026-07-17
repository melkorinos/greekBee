"use client";

// GodModeOverlay — the dev-only 🧪 launcher and its drawer.
//
// Self-gating: renders nothing unless ?godmode=zzkdgr3 is in the URL, so the board
// can mount it unconditionally. Callers that need to *suppress* something in god
// mode (score submission, achievement posting) read useIsGodMode directly.

import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { GodModePanel } from "./GodModePanel";
import { useIsGodMode } from "@/games/leksokipos/hooks/useIsGodMode";
import { useState } from "react";

interface GodModeOverlayProps {
  puzzle:     LeksokiposPuzzle;
  foundWords: string[];
  onInject:   (words: string[]) => void;
  onReset:    () => void;
}

export function GodModeOverlay({ puzzle, foundWords, onInject, onReset }: GodModeOverlayProps) {
  const isGodMode = useIsGodMode();
  const [isOpen, setIsOpen] = useState(false);

  if (!isGodMode) return null;

  return (
    <>
      <button
        data-testid="btn-god-mode"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="God Mode"
        className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-surface border border-border shadow-lg flex items-center justify-center text-lg hover:bg-surface-raised transition-colors"
      >
        🧪
      </button>
      <GodModePanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        puzzle={puzzle}
        foundWords={foundWords}
        onInject={onInject}
        onReset={onReset}
      />
    </>
  );
}
