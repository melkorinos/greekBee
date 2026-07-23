"use client";

// TopothesiesBoard — the Worldle-style play surface.
// Stage 1: guess the regional unit / island from its silhouette (4 tries).
// Stage 2 (bonus): guess that unit's capital (3 tries). Each wrong guess shows a
// distance chip + 8-way arrow + proximity %, all from the reducer's hint payload
// (which reads centroids/capitalCoords — never geometry). Score posts CONTINUOUSLY
// on every live increase, like the other round games; restored rounds never post.

import { useMemo, useState } from "react";

import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";
import { useLiveScorePost } from "@/hooks/useLiveScorePost";

import { TOPOTHESIES } from "@/config/gameRules";
import type { TopothesiesAnswer, TopothesiesShape } from "@/games/topothesies/types";
import { useTopothesiesRound } from "@/games/topothesies/hooks/useTopothesiesRound";
import { computeScore } from "@/games/topothesies/lib/scoring";
import { buildShareText } from "@/games/topothesies/lib/shareText";

import { todayISO } from "@/lib/puzzleDate";
import { btnApprove } from "@/styles/recipes";
import { GameLeaderboardModal } from "@/components/shared/GameLeaderboardModal";
import { GuessAutocomplete, type GuessCandidate } from "./GuessAutocomplete";
import { TopothesiesSilhouette } from "./TopothesiesSilhouette";
import { TopothesiesResult } from "./TopothesiesResult";
import { TopothesiesGiveUpModal } from "./TopothesiesGiveUpModal";

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

/**
 * A name-reveal panel shown BELOW the map when a stage resolves: the correct
 * answer, styled green with a celebratory emoji when the player got it, neutral
 * when they didn't — plus an always-green "next" button (it pops out) that the
 * player accepts before the next stage begins.
 */
function NameReveal({
  testId,
  correct,
  name,
  sub,
  buttonLabel,
  onContinue,
}: {
  testId:      string;
  correct:     boolean;
  name:        string;
  sub?:        string;
  buttonLabel: string;
  onContinue:  () => void;
}) {
  return (
    <div
      data-testid={testId}
      className="w-full flex flex-col items-center gap-2 text-center"
    >
      <p className={`text-sm font-semibold ${correct ? "text-success" : "text-muted"}`}>
        {correct ? "Σωστά! 🎉" : "Η σωστή απάντηση"}
      </p>
      <p className={`text-3xl font-bold ${correct ? "text-success" : "text-foreground"}`}>{name}</p>
      {sub && <p className="text-sm text-muted">{sub}</p>}
      <button
        onClick={onContinue}
        className={`mt-2 px-6 py-2.5 rounded-control text-sm font-semibold ${btnApprove}`}
      >
        {buttonLabel}
      </button>
    </div>
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
  const [giveUpOpen, setGiveUpOpen] = useState(false);

  // Each stage ends with a reveal the player must accept before the next stage
  // begins (these acks are UI-only). A reveal is gated on `hasLiveActed`, so a
  // resumed (restored) round shows no reveal and never re-gates progress the
  // player already made — only a live transition this session draws one.
  const [shapeAck, setShapeAck] = useState(false);
  const [capitalAck, setCapitalAck] = useState(false);

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

  const live            = hasLiveActed();
  const shapeResolved   = state.shapeSolved || state.shapeFailed;
  const capitalResolved = state.capitalSolved || state.capitalFailed;

  const showShapeReveal   = live && shapeResolved && !state.gaveUp && !shapeAck;
  const showCapitalInput  = state.stage === "capital" && (!live || shapeAck);
  const showCapitalReveal = live && capitalResolved && !state.gaveUp && !capitalAck;
  const showResult        = state.stage === "finished" && (!live || state.gaveUp || capitalAck);

  return (
    <div className="flex flex-col items-center gap-4 py-4 w-full max-w-game">
      {/* Silhouette — framed like a card so it reads as a deliberate panel, not
          loose geometry floating in the column. Border thickness is a step up
          from the usual hairline page margins. */}
      <div className="relative w-full flex items-center justify-center min-h-[42vh] rounded-card border-4 border-border bg-surface p-3">
        <TopothesiesSilhouette shape={shape} />
      </div>

      {/* Stage reveals — shown BELOW the map (never over it). */}
      {showShapeReveal && (
        <NameReveal
          testId="shape-reveal"
          correct={state.shapeSolved}
          name={target.name}
          sub="Τώρα βρες την πρωτεύουσα."
          buttonLabel="Συνέχεια →"
          onContinue={() => setShapeAck(true)}
        />
      )}

      {showCapitalReveal && (
        <NameReveal
          testId="capital-reveal"
          correct={state.capitalSolved}
          name={target.capital}
          sub={state.capitalSolved ? "Ολοκλήρωσες τον γύρο!" : undefined}
          buttonLabel="Δες το σκορ →"
          onContinue={() => setCapitalAck(true)}
        />
      )}

      {/* Stage 1 guess history — visible while guessing the shape AND during its
          reveal (so the attempts sit alongside the answer), then cleared once the
          capital round begins: no mentions of the previous round carry over. */}
      {state.shapeGuesses.length > 0 && !showCapitalInput && state.stage !== "finished" && (
        <ul className="w-full flex flex-col gap-1.5" data-testid="shape-guesses">
          {state.shapeGuesses.map((g, i) => (
            <li
              key={i}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-control border ${
                g.correct
                  ? "border-success-border bg-success-surface"
                  : "border-border bg-surface"
              }`}
            >
              <span className={`font-semibold ${g.correct ? "text-success" : "text-foreground"}`}>
                {g.guessId ? nameById.get(g.guessId) : "—"}
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

      {/* Capital stage: the accepted unit stays on screen while guessing its capital */}
      {showCapitalInput && (
        <div className="w-full flex flex-col gap-2 items-center">
          <p className="text-center text-sm">
            <span className="text-muted">Η περιοχή: </span>
            <span className={`font-bold ${state.shapeSolved ? "text-success" : "text-foreground"}`}>
              {target.name}
            </span>
          </p>
        </div>
      )}

      {state.capitalGuesses.length > 0 && (
        <ul className="w-full flex flex-col gap-1.5" data-testid="capital-guesses">
          {state.capitalGuesses.map((g, i) => (
            <li
              key={i}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-control border ${
                g.correct
                  ? "border-success-border bg-success-surface"
                  : "border-border bg-surface"
              }`}
            >
              <span className={`font-semibold ${g.correct ? "text-success" : "text-foreground"}`}>
                {capitalLabelFor(g.guessNormalized)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {showCapitalInput && (
        <div className="w-full flex flex-col gap-2 items-center">
          <p className="text-sm text-muted">Ποια είναι η πρωτεύουσα; ({capitalLeft} προσπάθειες)</p>
          <GuessAutocomplete
            candidates={capitalCandidates}
            placeholder="Γράψε την πρωτεύουσα…"
            onSubmit={(text) => dispatch({ type: "GUESS_CAPITAL", text })}
          />
        </div>
      )}

      {(state.stage === "shape" || showCapitalInput) && (
        <button
          data-testid="btn-give-up"
          onClick={() => setGiveUpOpen(true)}
          className="text-sm text-muted underline hover:text-foreground transition-colors"
        >
          Παραίτηση
        </button>
      )}

      {showResult && (
        <TopothesiesResult
          target={target}
          score={score}
          shareText={buildShareText(state)}
          onOpenLeaderboard={onOpenLeaderboard}
        />
      )}

      <TopothesiesGiveUpModal
        isOpen={giveUpOpen}
        onClose={() => setGiveUpOpen(false)}
        onConfirm={() => {
          dispatch({ type: "GIVE_UP" }); // gaveUp shows the result directly — no reveal gate
          setGiveUpOpen(false);
        }}
      />

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
