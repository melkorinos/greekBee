"use client";

// LeaderboardModal — shared bottom-sheet leaderboard skeleton.
//
// Manages: selectedDate state, nameInput state, useLeaderboard call,
// day strip rendering, leaderboard table, name editor.
//
// Callers customise the look via pillActive / playerMark Tailwind class strings
// and plug in game-specific slots (profile section, footer link, empty CTA).

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
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
} from "@/components/leksokipos/styles";

// ── Day-label helpers ─────────────────────────────────────────────────────────

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
  /** Tailwind classes applied to the selected day pill. */
  pillActive:      string;
  /** Tailwind class applied to the "(εσύ)" label. */
  playerMark:      string;
  /** Rendered between the header and the name editor (e.g. profile section). */
  topSlot?:        React.ReactNode;
  /** When false, the name editor is hidden. Defaults to true. */
  showNameEditor?: boolean;
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
  pillActive,
  playerMark,
  topSlot,
  showNameEditor = true,
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
    if (!trimmed) return;
    onSaveName(trimmed);
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const { top20, playerRow } = data;
  const nameDirty            = nameInput.trim() !== displayName && nameInput.trim() !== "";
  const footer               = footerSlot?.(selectedDate);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative bg-white dark:bg-stone-900 rounded-t-2xl w-full max-w-sm max-h-[82vh] flex flex-col shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">{title}</h2>
            {subtitle && (
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Κλείσιμο"
          >
            ×
          </button>
        </div>

        {/* ── Top slot (e.g. profile section) ────────────────────────────────── */}
        {topSlot && (
          <div className="border-b border-stone-100 dark:border-stone-800">
            {topSlot}
          </div>
        )}

        {/* ── Display name ───────────────────────────────────────────────────── */}
        {showNameEditor && (
          <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-800">
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
                disabled={!nameDirty}
                className={btnPrimaryCompact}
              >
                {!nameDirty && displayName ? "✓" : "Αποθήκευση"}
              </button>
            </div>
          </div>
        )}

        {/* ── Day strip ──────────────────────────────────────────────────────── */}
        {dates.length > 0 && (
          <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
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
                        ? pillActive
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
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
              className="mt-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              aria-label="Ανανέωση"
            >
              ↻ Ανανέωση
            </button>
          </div>
        )}

        {/* ── Leaderboard content ────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-5 py-3">

          {isLoading && (
            <p className="text-center text-stone-400 dark:text-stone-500 text-sm py-10">Φόρτωση…</p>
          )}

          {!isLoading && error && (
            <p className="text-center text-red-400 text-sm py-10">{error}</p>
          )}

          {!isLoading && !error && top20.length === 0 && (
            <div className="text-center py-10">
              <p className="text-stone-400 dark:text-stone-500 text-sm mb-3">
                Κανείς δεν έχει παίξει αυτή την ημέρα ακόμα.
              </p>
              {emptySlot?.(selectedDate)}
            </div>
          )}

          {!isLoading && !error && top20.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="text-stone-400 dark:text-stone-500 text-xs uppercase tracking-wide">
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
                        <span className={`${playerMark} ml-1 text-xs`}>(εσύ)</span>
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
              <div className="border-t-2 border-dashed border-stone-200 dark:border-stone-700 my-3" />
              <table className="w-full">
                <tbody>
                  <tr className={`${lbRowBase} ${lbRowPlayer}`}>
                    <td className={lbTdRank}>{playerRow.rank}</td>
                    <td className={lbTdName}>
                      {playerRow.display_name}
                      <span className={`${playerMark} ml-1 text-xs`}>(εσύ)</span>
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
          <div className="px-5 py-3 border-t border-stone-100 dark:border-stone-800 text-center">
            {footer}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Re-export Link for use in footerSlot / emptySlot factories ────────────────
export { Link };
