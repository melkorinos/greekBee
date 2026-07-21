"use client";

// TopothesiesBoard — the Worldle-style play surface.
// Stage 1: guess the regional unit / island from its silhouette (4 tries).
// Stage 2 (bonus): guess that unit's capital (3 tries). Each wrong guess shows a
// distance chip + 8-way arrow + proximity %, all from the reducer's hint payload
// (which reads centroids/capitalCoords — never geometry). Score posts CONTINUOUSLY
// on every live increase, like the other round games; restored rounds never post.

import { useMemo } from "react";

import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";
import { useLiveScorePost } from "@/hooks/useLiveScorePost";

import { TOPOTHESIES } from "@/config/gameRules";
import type { TopothesiesAnswer, TopothesiesShape } from "@/games/topothesies/types";
import { useTopothesiesRound } from "@/games/topothesies/hooks/useTopothesiesRound";
import { computeScore } from "@/games/topothesies/lib/scoring";
import { buildShareText } from "@/games/topothesies/lib/shareText";

import { todayISO } from "@/lib/puzzleDate";
import { GameLeaderboardModal } from "@/components/shared/GameLeaderboardModal";
import { GuessAutocomplete, type GuessCandidate } from "./GuessAutocomplete";
import { TopothesiesSilhouette } from "./TopothesiesSilhouette";
import { TopothesiesResult } from "./TopothesiesResult";

interface TopothesiesBoardProps {
  answers:            TopothesiesAnswer[];
  target:             TopothesiesAnswer;
  shape:              TopothesiesShape;
  today:              string;
  maxKm:              number;
  isLeaderboardOpen:  boolean;
  onOpenLeaderboard:  () => void;
  onCloseLeaderboard: () => void;
}

/** A distance/direction/proximity chip for one wrong guess. */
function HintChips({ hint }: { hint: { distanceKm: number; arrow: string; proximityPct: number } }) {
  return (
    <span className="flex items-center gap-2 tabular-nums text-sm">
      <span className="font-semibold text-foreground">{Math.round(hint.distanceKm)} χλμ</span>
      <span className="text-lg leading-none">{hint.arrow}</span>
      <span className="text-muted">{hint.proximityPct}%</span>
    </span>
  );
}

export function TopothesiesBoard({
  answers,
  target,
  shape,
  today,
  maxKm,
  isLeaderboardOpen,
  onOpenLeaderboard,
  onCloseLeaderboard,
}: TopothesiesBoardProps) {
  const identity = usePlayerIdentity();
  const { deviceId, displayName } = identity;

  const { state, dispatch, hasLiveActed } = useTopothesiesRound(target, answers, maxKm, today);
  const score = computeScore(state);

  const { submit: postScore } = useScoreSubmission({
    gameId:     "topothesies",
    puzzleDate: today,
    deviceId,
    displayName,
  });

  useLiveScorePost({
    score,
    isFinished: state.stage === "finished",
    hasLiveActed,
    post:       postScore,
    onFinish:   onOpenLeaderboard,
  });

  const nameById = useMemo(() => new Map(answers.map((a) => [a.id, a.name])), [answers]);

  const shapeCandidates = useMemo<GuessCandidate[]>(
    () => answers.map((a) => ({ label: a.name, normalized: a.nameNormalized })),
    [answers],
  );
  const capitalCandidates = useMemo<GuessCandidate[]>(() => {
    const seen = new Set<string>();
    const out: GuessCandidate[] = [];
    for (const a of answers) {
      if (seen.has(a.capitalNormalized)) continue;
      seen.add(a.capitalNormalized);
      out.push({ label: a.capital, normalized: a.capitalNormalized });
    }
    return out;
  }, [answers]);

  const capitalLabelFor = (normalized: string): string =>
    answers.find((a) => a.capitalNormalized === normalized)?.capital ?? normalized;

  const shapeLeft   = TOPOTHESIES.SHAPE_GUESSES - state.shapeGuesses.length;
  const capitalLeft = TOPOTHESIES.CAPITAL_GUESSES - state.capitalGuesses.length;

  return (
    <div className="flex flex-col items-center gap-4 py-4 w-full max-w-game">
      {/* Silhouette */}
      <div className="w-full flex items-center justify-center min-h-[42vh]">
        <TopothesiesSilhouette shape={shape} />
      </div>

      {/* Stage 1 guess history */}
      {state.shapeGuesses.length > 0 && (
        <ul className="w-full flex flex-col gap-1.5" data-testid="shape-guesses">
          {state.shapeGuesses.map((g, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-control border border-border bg-surface"
            >
              <span className="font-semibold text-foreground">
                {g.correct ? "🟩 " : ""}{g.guessId ? nameById.get(g.guessId) : "—"}
              </span>
              {g.hint && <HintChips hint={g.hint} />}
            </li>
          ))}
        </ul>
      )}

      {state.stage === "shape" && (
        <div className="w-full flex flex-col gap-2 items-center">
          <p className="text-sm text-muted">Ποια περιοχή είναι; ({shapeLeft} προσπάθειες)</p>
          <GuessAutocomplete
            candidates={shapeCandidates}
            placeholder="Γράψε την περιοχή…"
            onSubmit={(text) => dispatch({ type: "GUESS_SHAPE", text })}
          />
        </div>
      )}

      {/* Capital stage: reveal the unit, then guess its capital */}
      {(state.stage === "capital" || state.stage === "finished") && (
        <div className="w-full flex flex-col gap-2 items-center">
          <p className="text-center text-sm">
            <span className="text-muted">Η περιοχή: </span>
            <span className="font-bold text-foreground">{target.name}</span>
            {state.shapeSolved ? " ✅" : " ❌"}
          </p>
        </div>
      )}

      {state.capitalGuesses.length > 0 && (
        <ul className="w-full flex flex-col gap-1.5" data-testid="capital-guesses">
          {state.capitalGuesses.map((g, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-control border border-border bg-surface"
            >
              <span className="font-semibold text-foreground">
                {g.correct ? "🏛️ " : ""}{capitalLabelFor(g.guessNormalized)}
              </span>
              {g.hint && <HintChips hint={g.hint} />}
            </li>
          ))}
        </ul>
      )}

      {state.stage === "capital" && (
        <div className="w-full flex flex-col gap-2 items-center">
          <p className="text-sm text-muted">Ποια είναι η πρωτεύουσα; ({capitalLeft} προσπάθειες)</p>
          <GuessAutocomplete
            candidates={capitalCandidates}
            placeholder="Γράψε την πρωτεύουσα…"
            onSubmit={(text) => dispatch({ type: "GUESS_CAPITAL", text })}
          />
        </div>
      )}

      {state.stage === "finished" && (
        <TopothesiesResult
          target={target}
          score={score}
          shareText={buildShareText(state)}
          onOpenLeaderboard={onOpenLeaderboard}
        />
      )}

      <GameLeaderboardModal
        gameId="topothesies"
        isOpen={isLeaderboardOpen}
        today={todayISO()}
        defaultDate={today}
        onClose={onCloseLeaderboard}
        {...identity.leaderboardProps}
      />
    </div>
  );
}
