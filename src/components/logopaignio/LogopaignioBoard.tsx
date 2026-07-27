"use client";

// LogopaignioBoard — the "guess the logo" play surface (single stage; mirrors the
// posokanei board's spine). The framed, progressively de-blurring mark sits up
// top; the sector shows as a permanent free hint; each wrong guess adds a history
// row and de-blurs the mark one step. Score posts CONTINUOUSLY on every live
// increase, like the other round games; restored rounds never post.

import { useState } from "react";

import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import { useScoreSubmission } from "@/hooks/useScoreSubmission";
import { useLiveScorePost } from "@/hooks/useLiveScorePost";

import { LOGOPAIGNIO } from "@/config/gameRules";
import type { LogopaignioPuzzle } from "@/games/logopaignio/types";
import { useLogopaignioRound } from "@/games/logopaignio/hooks/useLogopaignioRound";
import { computeScore } from "@/games/logopaignio/lib/scoring";
import { buildShareText } from "@/games/logopaignio/lib/shareText";

import { todayISO } from "@/lib/puzzleDate";
import { GameLeaderboardModal } from "@/components/shared/GameLeaderboardModal";
import { LogoReveal } from "./LogoReveal";
import { GuessTextInput } from "./GuessTextInput";
import { LogopaignioResult } from "./LogopaignioResult";
import { LogopaignioGiveUpModal } from "./LogopaignioGiveUpModal";

interface LogopaignioBoardProps {
  target:             LogopaignioPuzzle;
  today:              string;
  isLeaderboardOpen:  boolean;
  onOpenLeaderboard:  () => void;
  onCloseLeaderboard: () => void;
}

export function LogopaignioBoard({
  target,
  today,
  isLeaderboardOpen,
  onOpenLeaderboard,
  onCloseLeaderboard,
}: LogopaignioBoardProps) {
  const identity = usePlayerIdentity();
  const { deviceId, displayName } = identity;

  const { state, dispatch, hasLiveActed } = useLogopaignioRound(target, today);
  const score = computeScore(state);
  const [giveUpOpen, setGiveUpOpen] = useState(false);

  const { submit: postScore } = useScoreSubmission({
    gameId:     "logopaignio",
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

  const wrongGuesses  = state.guesses.filter((g) => !g.correct).length;
  const finished      = state.stage === "finished";
  const guessesLeft   = LOGOPAIGNIO.MAX_GUESSES - state.guesses.length;

  return (
    <div className="flex flex-col items-center gap-4 py-4 w-full max-w-game">
      {/* The name-stripped mark, blurred and stepping toward clear per wrong guess. */}
      <LogoReveal markAsset={target.markAsset} wrongGuesses={wrongGuesses} revealed={finished} />

      {/* Permanent free hint: the brand's sector. */}
      <p className="text-sm text-muted">
        Τομέας: <span className="font-semibold text-foreground">{target.sector}</span>
      </p>

      {/* Guess history — spoiler-free: shows what the player typed + right/wrong. */}
      {state.guesses.length > 0 && (
        <ul className="w-full flex flex-col gap-1.5" data-testid="logopaignio-guesses">
          {state.guesses.map((g, i) => (
            <li
              key={i}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-control border ${
                g.correct ? "border-success-border bg-success-surface" : "border-border bg-surface"
              }`}
            >
              <span className={`font-semibold ${g.correct ? "text-success" : "text-foreground"}`}>
                {g.input}
              </span>
              <span className={`text-sm font-semibold ${g.correct ? "text-success" : "text-muted"}`}>
                {g.correct ? "Σωστά! 🎉" : "Λάθος"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Guess input */}
      {state.stage === "guessing" && (
        <div className="w-full flex flex-col gap-2 items-center">
          <p className="text-sm text-muted">Ποια εταιρεία είναι; ({guessesLeft} προσπάθειες)</p>
          <GuessTextInput onSubmit={(value) => dispatch({ type: "GUESS", input: value })} />
          <button
            data-testid="btn-give-up"
            onClick={() => setGiveUpOpen(true)}
            className="text-sm text-muted underline hover:text-foreground transition-colors"
          >
            Παραίτηση
          </button>
        </div>
      )}

      {finished && (
        <LogopaignioResult
          target={target}
          solved={state.solved}
          score={score}
          shareText={buildShareText(state)}
          onOpenLeaderboard={onOpenLeaderboard}
        />
      )}

      <LogopaignioGiveUpModal
        isOpen={giveUpOpen}
        onClose={() => setGiveUpOpen(false)}
        onConfirm={() => {
          dispatch({ type: "GIVE_UP" });
          setGiveUpOpen(false);
        }}
      />

      <GameLeaderboardModal
        gameId="logopaignio"
        isOpen={isLeaderboardOpen}
        today={todayISO()}
        defaultDate={today}
        onClose={onCloseLeaderboard}
        {...identity.leaderboardProps}
      />
    </div>
  );
}
