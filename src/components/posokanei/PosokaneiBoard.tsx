"use client";

// PosokaneiBoard — the "guess the price" play surface (single stage; mirrors the
// topothesies board's spine). The framed product photo sits up top; each wrong
// guess adds a row showing the guessed price, a direction arrow (🔼 go higher /
// 🔽 go lower), and a proximity %.
//
// Posts NO Score and renders NO leaderboard: the registry row declares no
// capabilities while the content is a single placeholder puzzle (src/config/games.ts).
// Restore both — the score hook, useLiveScorePost, and the modal, exactly as the
// topothesies board wires them — when the capabilities are granted.

import { useState } from "react";

import { POSOKANEI } from "@/config/gameRules";
import type { PosokaneiPuzzle, PriceDirection } from "@/games/posokanei/types";
import { usePosokaneiRound } from "@/games/posokanei/hooks/usePosokaneiRound";
import { computeScore } from "@/games/posokanei/lib/scoring";
import { buildShareText } from "@/games/posokanei/lib/shareText";
import { formatEuro } from "@/games/posokanei/lib/format";

import { FramedMedia } from "@/components/shared/FramedMedia";
import { PriceInput } from "./PriceInput";
import { PosokaneiResult } from "./PosokaneiResult";
import { PosokaneiGiveUpModal } from "./PosokaneiGiveUpModal";

interface PosokaneiBoardProps {
  target: PosokaneiPuzzle;
  today:  string;
}

/** The direction hint for a wrong guess: which way the true price lies. */
function DirectionChip({ direction, proximityPct }: { direction: PriceDirection; proximityPct: number }) {
  const arrow = direction === "higher" ? "🔼" : "🔽";
  const label = direction === "higher" ? "πιο πάνω" : "πιο κάτω";
  return (
    <span className="flex items-center gap-2 tabular-nums text-sm">
      <span className="text-lg leading-none">{arrow}</span>
      <span className="font-semibold text-foreground">{label}</span>
      <span className="text-muted">{proximityPct}%</span>
    </span>
  );
}

export function PosokaneiBoard({ target, today }: PosokaneiBoardProps) {
  const { state, dispatch } = usePosokaneiRound(target, today);
  const score = computeScore(state);
  const [giveUpOpen, setGiveUpOpen] = useState(false);

  const itemLabel = [target.item, target.brand].filter(Boolean).join(" ");
  const guessesLeft = POSOKANEI.MAX_GUESSES - state.guesses.length;

  return (
    <div className="flex flex-col items-center gap-4 py-4 w-full max-w-game">
      {/* Product photo — framed like a card (shared FramedMedia). The photo is
          open-license / own art, never the copyrighted gov image. */}
      <FramedMedia>
        {/* eslint-disable-next-line @next/next/no-img-element -- static public
            asset (SVG placeholder / raster photo); next/image needs extra config
            for SVG and adds no value for a single small in-frame image. */}
        <img
          src={target.photo}
          alt={`Προϊόν: ${target.item}`}
          className="max-h-[38vh] w-auto max-w-full object-contain"
        />
      </FramedMedia>

      {/* What are we pricing */}
      <div className="text-center">
        <p className="text-xl font-bold text-foreground">{itemLabel}</p>
        <p className="text-sm text-muted">{target.unit}</p>
      </div>

      {/* Guess history */}
      {state.guesses.length > 0 && (
        <ul className="w-full flex flex-col gap-1.5" data-testid="posokanei-guesses">
          {state.guesses.map((g, i) => (
            <li
              key={i}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-control border ${
                g.correct ? "border-success-border bg-success-surface" : "border-border bg-surface"
              }`}
            >
              <span className={`font-semibold tabular-nums ${g.correct ? "text-success" : "text-foreground"}`}>
                {formatEuro(g.value)}
              </span>
              {g.correct ? (
                <span className="text-sm font-semibold text-success">Σωστά! 🎉</span>
              ) : (
                <DirectionChip direction={g.direction} proximityPct={g.proximityPct} />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Guess input */}
      {state.stage === "guessing" && (
        <div className="w-full flex flex-col gap-2 items-center">
          <p className="text-sm text-muted">Πόσο κάνει; ({guessesLeft} προσπάθειες)</p>
          <PriceInput onSubmit={(value) => dispatch({ type: "GUESS", value })} />
          <button
            data-testid="btn-give-up"
            onClick={() => setGiveUpOpen(true)}
            className="text-sm text-muted underline hover:text-foreground transition-colors"
          >
            Παραίτηση
          </button>
        </div>
      )}

      {state.stage === "finished" && (
        <PosokaneiResult
          target={target}
          score={score}
          shareText={buildShareText(state)}
        />
      )}

      <PosokaneiGiveUpModal
        isOpen={giveUpOpen}
        onClose={() => setGiveUpOpen(false)}
        onConfirm={() => {
          dispatch({ type: "GIVE_UP" });
          setGiveUpOpen(false);
        }}
      />
    </div>
  );
}
