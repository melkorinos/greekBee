"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

import { GameBoard, type LeksokiposResult } from "./GameBoard";
import { Modal } from "@/components/shared/Modal";
import { ShareResultPanel } from "@/components/shared/ShareResultPanel";
import { buildShareText } from "@/games/leksokipos/lib/shareText";
import { getRankEmoji } from "@/games/leksokipos/lib";
import { GameHeader } from "@/components/shared/GameHeader";
import { HowToPlayModal } from "./HowToPlayModal";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { ShareButton } from "./ShareButton";
import { btnHeaderIcon, btnHeaderIconSize, chipWarning, tooltipBubble } from "@/styles/recipes";

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
      <div className={tooltipBubble}>
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

  // ── Round End (ADR 0025) ────────────────────────────────────────────────────
  // Λεξόκηπος alone POPS its Result Panel, because it has no moment where play
  // stops — reaching the top Rank is the moment, and the game continues past it.
  // The board reports the result (Rank + LIVE score); the panel and the pop live
  // here because the header ShareButton is what reopens them after a dismissal.
  const [result, setResult] = useState<LeksokiposResult | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);

  // Pop ONCE. The board re-reports on every score change so the shared number
  // stays live, and without this ref every found word would reopen the panel.
  // Per mount, like the ScoreBar's endgame cue it sits beside: GameBoard is keyed
  // by puzzle id, so each Daily Puzzle gets one pop.
  const hasPopped = useRef(false);
  const handleResultChange = useCallback((next: LeksokiposResult | null) => {
    setResult(next);
    if (!next || hasPopped.current) return;
    hasPopped.current = true;
    setIsResultOpen(true);
  }, []);

  return (
    <>
      <header className="w-full border-b border-border bg-surface px-4 py-3">
        <GameHeader title="🌸 Leksokipos" className="mx-auto">
          <VariantToggleButton variant={variant} onToggle={toggleVariant} />
          <ShareButton
            canonicalPath={canonicalPath}
            onShare={result ? () => setIsResultOpen(true) : undefined}
          />
          <HowToPlayModal />
        </GameHeader>
      </header>
      {tooFewWords && (
        <div className="w-full max-w-game mx-auto mt-3 px-4">
          <p className={`text-sm ${chipWarning} rounded-lg px-3 py-2 text-center`}>
            This letter combination has very few valid words. Try a different set!
          </p>
        </div>
      )}
      <div className="flex flex-1 w-full flex-col items-center bg-background">
        <GameBoard
          key={puzzle.id}
          puzzle={puzzle}
          variant={variant}
          onResultChange={handleResultChange}
        />
      </div>

      <Modal
        isOpen={isResultOpen && result !== null}
        onClose={() => setIsResultOpen(false)}
        ariaLabel="Αποτέλεσμα"
      >
        {result && (
          <ShareResultPanel
            testId="leksokipos-result"
            score={result.score}
            shareText={buildShareText(result)}
          >
            <p className="text-center text-muted text-sm">
              {`${getRankEmoji(result.rank)} ${result.rank}`}
            </p>
          </ShareResultPanel>
        )}
      </Modal>
    </>
  );
}
