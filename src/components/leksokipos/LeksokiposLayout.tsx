"use client";

import { useSyncExternalStore } from "react";

import { GameBoard } from "./GameBoard";
import { GameHeader } from "@/components/shared/GameHeader";
import { HowToPlayModal } from "./HowToPlayModal";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { ShareButton } from "./ShareButton";
import { btnHeaderIcon, btnHeaderIconSize } from "@/styles/recipes";

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
        className={`${btnHeaderIconSize} ${btnHeaderIcon} text-base`}
      >
        {variant === "pie" ? "🌸" : "🥧"}
      </button>
      <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-inverted px-2.5 py-1 text-xs text-inverted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {nextLabel}
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

interface LeksokiposLayoutProps {
  puzzle: LeksokiposPuzzle;
  canonicalPath: string;
  tooFewWords: boolean;
}

export function LeksokiposLayout({
  puzzle,
  canonicalPath,
  tooFewWords,
}: LeksokiposLayoutProps) {
  const variant = useSyncExternalStore(_subscribe, _getSnapshot, () => "pie" as const);

  function toggleVariant() {
    _setVariant(variant === "pie" ? "flower" : "pie");
  }

  return (
    <>
      <header className="w-full border-b border-border bg-surface px-4 py-3">
        <GameHeader title="🌸 Leksokipos" className="mx-auto">
          <VariantToggleButton variant={variant} onToggle={toggleVariant} />
          <ShareButton canonicalPath={canonicalPath} />
          <HowToPlayModal />
        </GameHeader>
      </header>
      {tooFewWords && (
        <div className="w-full max-w-game mx-auto mt-3 px-4">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
            This letter combination has very few valid words. Try a different set!
          </p>
        </div>
      )}
      <div className="flex flex-1 w-full flex-col items-center bg-background">
        <GameBoard key={puzzle.id} puzzle={puzzle} variant={variant} />
      </div>
    </>
  );
}
