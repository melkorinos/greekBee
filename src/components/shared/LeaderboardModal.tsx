"use client";

// LeaderboardModal — shared bottom-sheet leaderboard skeleton.
//
// Manages: selectedDate state, nameInput state, useLeaderboard call,
// day strip rendering, leaderboard table, name editor.
//
// The accent (selected-day pill, "(εσύ)" mark, player-row tint) comes from the
// game's --game-accent token (ADR 0009), set on the game's [data-game] wrapper —
// callers no longer pass colour strings. They still plug in game-specific slots
// (profile section, footer link, empty CTA).

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { Modal } from "./Modal";
import type { LeaderboardUrlBuilder } from "@/hooks/useLeaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import {
  btnPrimaryCompact,
  inputCompactClass,
  labelClass,
  lbRowBase,
  lbRowPlayer,
  lbTdName,
  lbTdRank,
  lbTdScore,
} from "@/styles/recipes";

// ── URL builder factory ───────────────────────────────────────────────────────

/**
 * Creates a standard /api/game-scores URL builder for a given game.
 * Every leaderboard game is higher-is-better and sorts desc (ADR 0014), so no
 * caller passes a sort override today; the { sort: "asc" } escape hatch remains
 * for generality.
 */
export function buildLeaderboardUrl(
  gameId: string,
  options?: { sort?: "asc" },
): LeaderboardUrlBuilder {
  return (date, deviceId) => {
    const params = new URLSearchParams({ game_id: gameId, puzzle_date: date });
    if (options?.sort) params.set("sort", options.sort);
    if (deviceId) params.set("deviceId", deviceId);
    return `/api/game-scores?${params.toString()}`;
  };
}

// ── Day-label helpers ─────────────────────────────────────────────────────────

// Parsed and read back in the *same* (local) clock, so the label matches the
// date shown beside it in every timezone. Don't half-convert this to a UTC
// parse while leaving getDay()/getDate() local — that breaks west of UTC.
const GREEK_DAYS = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"] as const;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LeaderboardModalBaseProps {
  isOpen:          boolean;
  /** Modal title. Defaults to "🏆 Πίνακας Σκορ". */
  title?:          string;
  /** Optional subtitle shown below the title. */
  subtitle?:       string;
  deviceId:        string;
  displayName:     string;
  /** Today's date (YYYY-MM-DD) — used for "Σήμερα" pill label. */
  today:           string;
  /** Day-strip dates (newest-first). */
  dates:           string[];
  /** Which date should be initially selected. */
  defaultDate:     string;
  buildUrl:        LeaderboardUrlBuilder;
  /** Score column header. Defaults to "Σκορ". */
  scoreLabel?:     string;
  /** Score cell formatter. Defaults to String(n). */
  formatScore?:    (n: number) => string;
  /** Rendered between the header and the name editor (e.g. profile section). */
  topSlot?:        React.ReactNode;
  /** When false, the name editor is hidden. Defaults to true. */
  showNameEditor?: boolean;
  /** When true, the save button is always active and always labelled "Αποθήκευση". Used when saving triggers profile creation. */
  saveButtonAlwaysActive?: boolean;
  /** Rendered inside the empty-state block for game-specific CTAs. */
  emptySlot?:      (selectedDate: string) => React.ReactNode;
  /** Rendered in the footer when viewing a past date. */
  footerSlot?:     (selectedDate: string) => React.ReactNode;
  onSaveName:      (name: string) => void;
  onClose:         () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LeaderboardModalBase({
  isOpen,
  title          = "🏆 Πίνακας Σκορ",
  subtitle,
  deviceId,
  displayName,
  today,
  dates,
  defaultDate,
  buildUrl,
  scoreLabel     = "Σκορ",
  formatScore    = String,
  topSlot,
  showNameEditor          = true,
  saveButtonAlwaysActive  = false,
  emptySlot,
  footerSlot,
  onSaveName,
  onClose,
}: LeaderboardModalBaseProps) {
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [nameInput,    setNameInput]    = useState(displayName);

  useEffect(() => { setNameInput(displayName); }, [displayName]);

  useEffect(() => {
    if (isOpen) setSelectedDate(defaultDate);
  }, [isOpen, defaultDate]);

  // Stable url builder passed to hook — memoized to avoid re-fetching on unrelated renders.
  const stableBuildUrl: LeaderboardUrlBuilder = useMemo(() => buildUrl, [buildUrl]);

  const { data, isLoading, error, refresh } = useLeaderboard(
    selectedDate,
    deviceId,
    isOpen,
    stableBuildUrl,
  );

  function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!saveButtonAlwaysActive && !trimmed) return;
    onSaveName(trimmed);
  }

  const { top20, playerRow } = data;
  const nameDirty            = nameInput.trim() !== displayName && nameInput.trim() !== "";
  const saveDisabled         = saveButtonAlwaysActive ? false : !nameDirty;
  const saveLabel            = saveButtonAlwaysActive ? "Αποθήκευση" : (!nameDirty && displayName ? "✓" : "Αποθήκευση");
  const footer               = footerSlot?.(selectedDate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      ariaLabel={title}
      cardClassName="max-h-[82vh] flex flex-col"
    >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-xs text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-raised"
            aria-label="Κλείσιμο"
          >
            ×
          </button>
        </div>

        {/* ── Top slot (e.g. profile section) ────────────────────────────────── */}
        {topSlot && (
          <div className="border-b border-border">
            {topSlot}
          </div>
        )}

        {/* ── Display name ───────────────────────────────────────────────────── */}
        {showNameEditor && !saveButtonAlwaysActive && (
          <div className="px-5 py-3 border-b border-border">
            <label className={`${labelClass} mb-1.5`}>Το όνομά σου</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && nameDirty && handleSaveName()}
                placeholder="Ανώνυμος"
                maxLength={30}
                className={`flex-1 ${inputCompactClass}`}
              />
              <button
                onClick={handleSaveName}
                disabled={saveDisabled}
                className={btnPrimaryCompact}
              >
                {saveLabel}
              </button>
            </div>
          </div>
        )}

        {/* ── Day strip ──────────────────────────────────────────────────────── */}
        {dates.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {dates.map((date) => {
                const isSelected = date === selectedDate;
                const isToday    = date === today;
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    aria-pressed={isSelected}
                    aria-label={date}
                    className={`shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-game-accent text-game-accent-foreground"
                        : "bg-surface-raised text-muted hover:bg-border"
                    }`}
                  >
                    <span className="text-[0.6rem] font-semibold leading-tight">
                      {isToday ? "Σήμερα" : GREEK_DAYS[new Date(date + "T00:00:00").getDay()]}
                    </span>
                    <span className="text-sm font-bold leading-tight">
                      {new Date(date + "T00:00:00").getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => void refresh()}
              className="mt-1.5 text-xs text-muted hover:text-foreground transition-colors"
              aria-label="Ανανέωση"
            >
              ↻ Ανανέωση
            </button>
          </div>
        )}

        {/* ── Leaderboard content ────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-5 py-3">

          {isLoading && (
            <p className="text-center text-muted text-sm py-10">Φόρτωση…</p>
          )}

          {!isLoading && error && (
            <p className="text-center text-danger text-sm py-10">{error}</p>
          )}

          {!isLoading && !error && top20.length === 0 && (
            <div className="text-center py-10">
              <p className="text-muted text-sm mb-3">
                Κανείς δεν έχει παίξει αυτή την ημέρα ακόμα.
              </p>
              {emptySlot?.(selectedDate)}
            </div>
          )}

          {!isLoading && !error && top20.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="text-muted text-xs uppercase tracking-wide">
                  <th className="text-left pb-2 pr-2 w-6">#</th>
                  <th className="text-left pb-2">Όνομα</th>
                  <th className="text-right pb-2 pl-4">{scoreLabel}</th>
                </tr>
              </thead>
              <tbody>
                {top20.map((row) => (
                  <tr
                    key={row.rank}
                    className={`${lbRowBase} ${row.isPlayer ? lbRowPlayer : ""}`}
                  >
                    <td className={lbTdRank}>{row.rank}</td>
                    <td className={lbTdName}>
                      {row.display_name}
                      {row.isPlayer && (
                        <span className="text-game-accent ml-1 text-xs">(εσύ)</span>
                      )}
                    </td>
                    <td className={lbTdScore}>{formatScore(row.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isLoading && playerRow && (
            <>
              <div className="border-t-2 border-dashed border-border my-3" />
              <table className="w-full">
                <tbody>
                  <tr className={`${lbRowBase} ${lbRowPlayer}`}>
                    <td className={lbTdRank}>{playerRow.rank}</td>
                    <td className={lbTdName}>
                      {playerRow.display_name}
                      <span className="text-game-accent ml-1 text-xs">(εσύ)</span>
                    </td>
                    <td className={lbTdScore}>{formatScore(playerRow.score)}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* ── Footer slot ────────────────────────────────────────────────────── */}
        {footer && (
          <div className="px-5 py-3 border-t border-border text-center">
            {footer}
          </div>
        )}
    </Modal>
  );
}

// ── Re-export Link for use in footerSlot / emptySlot factories ────────────────
export { Link };
