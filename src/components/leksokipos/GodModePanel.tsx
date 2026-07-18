"use client";

// GodModePanel — dev-only right-side drawer for testing Endgame Zone and full completion.
// Activated by ?godmode=zzkdgr3 in the URL. Never renders in production without
// the secret param. Score submissions are disabled while god mode is active.

import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { isPangram } from "@/games/leksokipos/lib";
import { useMemo } from "react";

interface GodModePanelProps {
  isOpen:     boolean;
  onClose:    () => void;
  puzzle:     LeksokiposPuzzle;
  foundWords: string[];
  onInject:   (words: string[]) => void;
  onReset:    () => void;
}

export function GodModePanel({
  isOpen,
  onClose,
  puzzle,
  foundWords,
  onInject,
  onReset,
}: GodModePanelProps) {
  const foundSet = useMemo(() => new Set(foundWords), [foundWords]);

  const byLength = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const w of puzzle.validWords) {
      const group = map.get(w.length) ?? [];
      group.push(w);
      map.set(w.length, group);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b - a)
      .map(([length, words]) => ({ length, words: [...words].sort() }));
  }, [puzzle.validWords]);

  const actionBtn = "text-sm rounded-lg border border-border px-3 py-2 hover:bg-surface-raised text-left w-full transition-colors";

  return (
    <>
      {/* Backdrop — only visible when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        data-testid="god-mode-panel"
        className={`fixed top-0 right-0 h-full w-72 bg-surface border-l border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <span className="font-bold text-sm text-foreground">God Mode 🧪</span>
          <button
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="text-muted hover:text-foreground text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-border flex-shrink-0">
          <button
            className={actionBtn}
            onClick={() => onInject(puzzle.validWords.slice(0, -1))}
          >
            🟡 Βρες Όλες-1
          </button>
          <button
            className={actionBtn}
            onClick={() => onInject([...puzzle.validWords])}
          >
            🏆 Βρες Όλες
          </button>
          <button
            className={`${actionBtn} text-muted`}
            onClick={onReset}
          >
            🔄 Reset
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 py-2 text-xs text-muted border-b border-border flex-shrink-0">
          {foundWords.length} / {puzzle.validWords.length} λέξεις βρεθήκαν
        </div>

        {/* Word list grouped by length */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {byLength.map(({ length, words }) => (
            <div key={length}>
              <div className="text-xs font-semibold text-muted mb-1.5">
                {length}γρ — {words.length}
              </div>
              <div className="flex flex-wrap gap-1">
                {words.map((w) => {
                  const found = foundSet.has(w);
                  const pang  = isPangram(w, puzzle);
                  return (
                    <span
                      key={w}
                      className={`text-xs px-1.5 py-0.5 rounded border font-mono ${
                        found && pang  ? "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300"
                        : found        ? "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300"
                        : pang         ? "border-amber-300 text-amber-500 dark:border-amber-700 dark:text-amber-600"
                        :                "border-border text-muted/50"
                      }`}
                    >
                      {w}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
