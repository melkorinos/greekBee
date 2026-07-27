"use client";

// GameLeaderboardModal — the single leaderboard modal every game renders.
//
// Per-game variation (a game-id string, a subtitle, a score label, a sort
// direction, and — for every game but Leksindeseis — a "play this puzzle"
// link into its own day-strip date) is data, not code: it lives in
// GAME_LEADERBOARD_CONFIG below, and one component consumes it keyed by
// `gameId`. Adding a game's leaderboard = one config row; adding its play-link
// = `...playLinkSlots(route)` in that row (the route must accept a
// `?puzzle=<date>` param, see resolvePuzzleDateParam).
//
// Runtime date context (today / dates / defaultDate / leksindeseis score) stays a
// caller prop — it is genuinely per-render, not static config. The identity bundle
// is `usePlayerIdentity().leaderboardProps` (or, for the two boards that assemble
// identity by hand, the same flat props).

import type { ReactNode } from "react";
import Link from "next/link";

import type { LeaderboardUrlBuilder } from "@/hooks/useLeaderboard";
import type { PlayerIdentityLeaderboardProps } from "@/hooks/usePlayerIdentity";
import {
  LeaderboardModalBase,
  buildLeaderboardUrl,
} from "@/components/shared/LeaderboardModal";
import { getLast7Dates } from "@/lib/puzzleDate";
import { useLeaderboardProfileSlot } from "@/components/shared/LeaderboardProfileSlot";

// ── Config ────────────────────────────────────────────────────────────────────

/** Passed to the dynamic slot factories so a config row can build a play-link. */
interface SlotCtx {
  today:       string;
  defaultDate: string;
  onClose:     () => void;
}

interface LeaderboardViewConfig {
  buildUrl:     LeaderboardUrlBuilder;
  /** Modal title. Omit for the base default ("🏆 Πίνακας Σκορ"). */
  title?:       string;
  /** Static subtitle, or one derived from the leksindeseis score. */
  subtitle?:    string | ((ctx: { score?: number }) => string | undefined);
  scoreLabel?:  string;
  formatScore?: (n: number) => string;
  emptySlot?:   (selectedDate: string, ctx: SlotCtx) => ReactNode;
  footerSlot?:  (selectedDate: string, ctx: SlotCtx) => ReactNode;
}

// "Play this puzzle" links — every game with a day-strip gets one, pointing
// at its own route with a `?puzzle=<date>` param (the route resolves it via
// resolvePuzzleDateParam). emptySlot and footerSlot render the same link with
// a slightly different treatment (footer also closes the modal), so a config
// row gets both from one route via playLinkSlots(route).
function playLink(route: string, date: string, closeOnClick: boolean, { today, defaultDate, onClose }: SlotCtx): ReactNode {
  if (date === defaultDate) return null;
  return (
    <Link
      href={`${route}?puzzle=${date}`}
      onClick={closeOnClick ? onClose : undefined}
      className="text-muted text-sm underline hover:text-foreground transition-colors"
    >
      {date === today ? "Παίξε το σημερινό παζλ →" : "Παίξε αυτό το παζλ →"}
    </Link>
  );
}

/** A game's emptySlot + footerSlot pair, both linking to its own route. */
function playLinkSlots(route: string): Pick<LeaderboardViewConfig, "emptySlot" | "footerSlot"> {
  return {
    emptySlot:  (date, ctx) => playLink(route, date, false, ctx),
    footerSlot: (date, ctx) => playLink(route, date, true, ctx),
  };
}

/** The registered games that have a leaderboard (excludes stavrolekso, leksikastirio). */
export type LeaderboardGameId =
  | "leksokipos"
  | "leksiarxeio"
  | "leksindeseis"
  | "vrestifrasi"
  | "leksodromia"
  | "leksoplegma"
  | "topothesies"
  | "posokanei"
  | "logopaignio";

// Leksindeseis is excluded: still wip, its board doesn't yet thread a puzzle
// date through a route param, and its day-strip is deliberately single-date
// (see HomeTrophyButton) — revisit together when it graduates.
const GAME_LEADERBOARD_CONFIG: Record<LeaderboardGameId, LeaderboardViewConfig> = {
  leksokipos: {
    buildUrl: buildLeaderboardUrl("leksokipos"),
    ...playLinkSlots("/leksokipos"),
  },
  leksiarxeio: {
    buildUrl:   buildLeaderboardUrl("leksiarxeio"),
    subtitle:   "Άθροισμα σκορ (4–8 γράμματα) · υψηλότερο = καλύτερο",
    scoreLabel: "Σκορ",
    ...playLinkSlots("/leksiarxeio"),
  },
  leksindeseis: {
    buildUrl:    buildLeaderboardUrl("leksindeseis"),
    title:       "🏆 Κατάταξη",
    subtitle:    ({ score }) => ((score ?? 0) > 0 ? `Σκορ σου: ${score}/4` : undefined),
    scoreLabel:  "Σκορ",
    formatScore: (n: number) => `${n}/4`,
  },
  vrestifrasi: {
    // Points, higher-is-better (fewer guesses → more points), sorted desc like
    // every other board (ADR 0014). No sort override.
    buildUrl:   buildLeaderboardUrl("vrestifrasi"),
    subtitle:   "Πόντοι (λιγότερες προσπάθειες = περισσότεροι) · υψηλότερο = καλύτερο",
    scoreLabel: "Σκορ",
    ...playLinkSlots("/vres-tin-frasi"),
  },
  leksodromia: {
    buildUrl:   buildLeaderboardUrl("leksodromia"),
    subtitle:   "Πόντοι ημέρας · υψηλότερο = καλύτερο",
    scoreLabel: "Πόντοι",
    ...playLinkSlots("/leksodromia"),
  },
  leksoplegma: {
    buildUrl:   buildLeaderboardUrl("leksoplegma"),
    subtitle:   "Πόντοι ημέρας · υψηλότερο = καλύτερο",
    scoreLabel: "Πόντοι",
    ...playLinkSlots("/leksoplegma"),
  },
  topothesies: {
    buildUrl:   buildLeaderboardUrl("topothesies"),
    subtitle:   "Πόντοι ημέρας · υψηλότερο = καλύτερο",
    scoreLabel: "Πόντοι",
    ...playLinkSlots("/topothesies"),
  },
  posokanei: {
    buildUrl:   buildLeaderboardUrl("posokanei"),
    subtitle:   "Πόντοι ημέρας · υψηλότερο = καλύτερο",
    scoreLabel: "Πόντοι",
    ...playLinkSlots("/posokanei"),
  },
  logopaignio: {
    buildUrl:   buildLeaderboardUrl("logopaignio"),
    subtitle:   "Πόντοι ημέρας · υψηλότερο = καλύτερο",
    scoreLabel: "Πόντοι",
    ...playLinkSlots("/logopaignio"),
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export interface GameLeaderboardModalProps extends PlayerIdentityLeaderboardProps {
  gameId:  LeaderboardGameId;
  isOpen:  boolean;
  onClose: () => void;
  /** Today's date (YYYY-MM-DD) — drives the "Σήμερα" pill. */
  today:   string;
  /** Day-strip dates (newest-first). Defaults to the last 7 days from `today`. */
  dates?:  string[];
  /** Initially selected date. Defaults to `today`. */
  defaultDate?: string;
  /** Leksindeseis-only: mistakes remaining (1–4), feeds the subtitle. */
  score?:  number;
}

export function GameLeaderboardModal({
  gameId,
  isOpen,
  onClose,
  today,
  dates,
  defaultDate,
  score,
  deviceId,
  displayName,
  onSaveName,
  ...profile
}: GameLeaderboardModalProps) {
  const cfg          = GAME_LEADERBOARD_CONFIG[gameId];
  const resolvedDefaultDate = defaultDate ?? today;
  const resolvedDates       = dates ?? getLast7Dates(today);
  const slotCtx: SlotCtx    = { today, defaultDate: resolvedDefaultDate, onClose };
  const subtitle     = typeof cfg.subtitle === "function" ? cfg.subtitle({ score }) : cfg.subtitle;

  const profileSlot  = useLeaderboardProfileSlot({ displayName, onSaveName, ...profile });

  return (
    <LeaderboardModalBase
      isOpen={isOpen}
      title={cfg.title}
      subtitle={subtitle}
      today={today}
      dates={resolvedDates}
      defaultDate={resolvedDefaultDate}
      deviceId={deviceId}
      displayName={displayName}
      buildUrl={cfg.buildUrl}
      scoreLabel={cfg.scoreLabel}
      formatScore={cfg.formatScore}
      emptySlot={cfg.emptySlot ? (d) => cfg.emptySlot!(d, slotCtx) : undefined}
      footerSlot={cfg.footerSlot ? (d) => cfg.footerSlot!(d, slotCtx) : undefined}
      onClose={onClose}
      {...profileSlot}
    />
  );
}
