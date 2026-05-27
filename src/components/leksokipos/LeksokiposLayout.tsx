"use client";

import { useSyncExternalStore } from "react";

import { GameBoard } from "./GameBoard";
import { HowToPlayModal } from "./HowToPlayModal";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { NewPuzzleButton } from "./NewPuzzleButton";
import { ShareButton } from "./ShareButton";

// ── Variant preference store ──────────────────────────────────────────────────
// Module-level pub/sub so useSyncExternalStore can subscribe without effects.

const VARIANT_KEY = "leksokipos-variant";
type GridVariant = "pie" | "flower";

const _listeners = new Set<() => void>();

function _subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

function _getSnapshot(): GridVariant {
  return localStorage.getItem(VARIANT_KEY) === "flower" ? "flower" : "pie";
}

function _setVariant(next: GridVariant) {
  localStorage.setItem(VARIANT_KEY, next);
  _listeners.forEach((fn) => fn());
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VariantToggleButton({
  variant,
  onToggle,
}: {
  variant: GridVariant;
  onToggle: () => void;
}) {
  const nextLabel = variant === "pie" ? "Λουλούδι" : "Τάρτα";
  return (
    <div className="relative group">
      <button
        onClick={onToggle}
        aria-label={`Εναλλαγή σε ${nextLabel}`}
        className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-200 dark:active:bg-stone-700 transition-colors text-base"
      >
        {variant === "pie" ? "🌸" : "🥧"}
      </button>
      <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-2.5 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {nextLabel}
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

interface LeksokiposLayoutProps {
  puzzle: LeksokiposPuzzle;
  recentPuzzleDates: string[];
  canonicalPath: string;
  tooFewWords: boolean;
}

export function LeksokiposLayout({
  puzzle,
  recentPuzzleDates,
  canonicalPath,
  tooFewWords,
}: LeksokiposLayoutProps) {
  const variant = useSyncExternalStore(_subscribe, _getSnapshot, () => "pie" as const);

  function toggleVariant() {
    _setVariant(variant === "pie" ? "flower" : "pie");
  }

  return (
    <>
      <header className="w-full border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <h1 className="text-xl font-bold tracking-tight text-stone-800 dark:text-stone-100">🌸 Leksokipos</h1>
          <div className="flex items-center gap-2">
            <VariantToggleButton variant={variant} onToggle={toggleVariant} />
            <ShareButton canonicalPath={canonicalPath} />
            <NewPuzzleButton />
            <HowToPlayModal />
          </div>
        </div>
      </header>
      {tooFewWords && (
        <div className="w-full max-w-sm mx-auto mt-3 px-4">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
            This letter combination has very few valid words. Try a different set!
          </p>
        </div>
      )}
      <div className="flex flex-1 w-full flex-col items-center bg-white dark:bg-stone-950">
        <GameBoard puzzle={puzzle} recentPuzzleDates={recentPuzzleDates} variant={variant} />
      </div>
    </>
  );
}
