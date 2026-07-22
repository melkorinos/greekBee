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
 * A reveal panel drawn ON TOP of the silhouette when a stage resolves: the
 * correct answer (so a wrong guess is unmistakable), and an explicit "continue"
 * the player must accept before the next stage begins.
 */
function StageReveal({
  testId,
  tone,
  heading,
  name,
  sub,
  buttonLabel,
  onContinue,
}: {
  testId:      string;
  tone:        "success" | "danger";
  heading:     string;
  name:        string;
  sub?:        string;
  buttonLabel: string;
  onContinue:  () => void;
}) {
  return (
    <div
      data-testid={testId}
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-card bg-surface/90 p-4 text-center"
    >
      <p className={`text-sm font-semibold ${tone === "success" ? "text-success" : "text-danger"}`}>
        {heading}
      </p>
      <p className="text-3xl font-bold text-foreground">{name}</p>
      {sub && <p className="text-sm text-muted">{sub}</p>}
      <button
        onClick={onContinue}
        className="mt-2 px-5 py-2.5 rounded-control bg-game-accent text-game-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
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
      {/* Silhouette — a stage reveal is drawn on top of it when a stage resolves. */}
      <div className="relative w-full flex items-center justify-center min-h-[42vh]">
        <TopothesiesSilhouette shape={shape} />

        {showShapeReveal && (
          <StageReveal
            testId="shape-reveal"
            tone={state.shapeSolved ? "success" : "danger"}
            heading={state.shapeSolved ? "Σωστά!" : "Η σωστή απάντηση"}
            name={target.name}
            sub="Τώρα βρες την πρωτεύουσα."
            buttonLabel="Συνέχεια →"
            onContinue={() => setShapeAck(true)}
          />
        )}

        {showCapitalReveal && (
          <StageReveal
            testId="capital-reveal"
            tone={state.capitalSolved ? "success" : "danger"}
            heading={state.capitalSolved ? "Σωστά!" : "Η σωστή πρωτεύουσα"}
            name={target.capital}
            sub={state.capitalSolved ? "Ολοκλήρωσες τον γύρο!" : undefined}
            buttonLabel="Δες το σκορ →"
            onContinue={() => setCapitalAck(true)}
          />
        )}
      </div>

      {/* Stage 1 guess history */}
      {state.shapeGuesses.length > 0 && (
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
            <span className={`font-bold ${state.shapeSolved ? "text-success" : "text-danger"}`}>
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
