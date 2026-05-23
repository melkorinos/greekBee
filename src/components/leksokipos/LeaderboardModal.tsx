// LeaderboardModal — bottom-sheet leaderboard for daily Leksokipos puzzles.
//
// Features:
//   - Rolling 7-day strip (pill buttons) to browse recent leaderboards;
//     defaults to today's puzzle; no calendar widget
//   - Top 20 rows sorted by score; player's own row is highlighted
//   - If the player is outside the top 20, their row is pinned below a dashed separator
//   - Inline display-name editor (persisted to localStorage via onSaveName)
//   - "Παίξε αυτό το παζλ" link to jump to any past day's puzzle
//   - Auto-polls every 5 min via useLeaderboard (only while modal is open)

"use client";

import { btnPrimaryCompact, inputCompactClass, labelClass, lbRowBase, lbRowPlayer, lbTdName, lbTdRank, lbTdScore } from "./styles";
import { useEffect, useState } from "react";

import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";

// ── Day-label helpers ─────────────────────────────────────────────────────────

const GREEK_DAYS = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"] as const;

/** Returns e.g. "Δευ 18" for a YYYY-MM-DD date string. */
function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${GREEK_DAYS[d.getDay()]} ${d.getDate()}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaderboardModalProps {
  isOpen:          boolean;
  defaultPuzzleId: string;   // current daily puzzle date e.g. "2026-05-18"
  recentDates:     string[]; // last 7 puzzle dates, newest-first (from data layer)
  deviceId:        string;
  displayName:     string;
  onSaveName:      (name: string) => void;
  onClose:         () => void;
}

export function LeaderboardModal({
  isOpen,
  defaultPuzzleId,
  recentDates,
  deviceId,
  displayName,
  onSaveName,
  onClose,
}: LeaderboardModalProps) {
  const [selectedDate, setSelectedDate] = useState(defaultPuzzleId);
  const [nameInput,    setNameInput]    = useState(displayName);

  // Today's date — used to determine which pill shows "Σήμερα".
  const today = new Date().toISOString().split("T")[0];

  // Sync name input if parent updates displayName (e.g. first-time save).
  useEffect(() => { setNameInput(displayName); }, [displayName]);

  // Reset to the current puzzle date every time the modal opens.
  useEffect(() => {
    if (isOpen) setSelectedDate(defaultPuzzleId);
  }, [isOpen, defaultPuzzleId]);

  const { data, isLoading, error, refresh } = useLeaderboard(
    selectedDate,
    deviceId,
    isOpen  // pause polling when modal is closed
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    onSaveName(trimmed);
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const { top20, playerRow } = data;
  const nameDirty = nameInput.trim() !== displayName && nameInput.trim() !== "";
  const isViewingCurrentPuzzle = selectedDate === defaultPuzzleId;


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Πίνακας Σκορ"
      onClick={handleOverlayClick}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Bottom-sheet panel */}
      <div className="relative bg-white rounded-t-2xl w-full max-w-sm max-h-[82vh] flex flex-col shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-100">
          <h2 className="text-base font-bold text-stone-800">🏆 Πίνακας Σκορ</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100"
            aria-label="Κλείσιμο"
          >
            ×
          </button>
        </div>

        {/* ── Display name ───────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-stone-100">
          <label className={`${labelClass} mb-1.5`}>
            Το όνομά σου
          </label>
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

        {/* ── Day strip ──────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-stone-100">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {recentDates.map((date) => {
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
                      ? "bg-amber-400 text-amber-900"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
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
            className="mt-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors"
            aria-label="Ανανέωση"
          >
            ↻ Ανανέωση
          </button>
        </div>

        {/* ── Leaderboard content ────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-5 py-3">

          {isLoading && (
            <p className="text-center text-stone-400 text-sm py-10">
              Φόρτωση…
            </p>
          )}

          {!isLoading && error && (
            <p className="text-center text-red-400 text-sm py-10">{error}</p>
          )}

          {!isLoading && !error && top20.length === 0 && (
            <div className="text-center py-10">
              <p className="text-stone-400 text-sm mb-3">
                Κανείς δεν έχει παίξει αυτή την ημέρα ακόμα.
              </p>
              {!isViewingCurrentPuzzle && selectedDate <= today && (
                <Link
                  href={`/leksokipos?puzzle=${selectedDate}`}
                  className="text-stone-600 text-sm underline hover:text-stone-800"
                >
                  Παίξε αυτό το παζλ →
                </Link>
              )}
            </div>
          )}

          {!isLoading && !error && top20.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="text-stone-400 text-xs uppercase tracking-wide">
                  <th className="text-left pb-2 pr-2 w-6">#</th>
                  <th className="text-left pb-2">Όνομα</th>
                  <th className="text-right pb-2 pl-4">Σκορ</th>
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
                        <span className="text-amber-500 ml-1 text-xs">(εσύ)</span>
                      )}
                    </td>
                    <td className={lbTdScore}>{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pinned player row — only shown when player is outside the top 20 */}
          {!isLoading && playerRow && (
            <>
              <div className="border-t-2 border-dashed border-stone-200 my-3" />
              <table className="w-full">
                <tbody>
                  <tr className={`${lbRowBase} ${lbRowPlayer}`}>
                    <td className={lbTdRank}>{playerRow.rank}</td>
                    <td className={lbTdName}>
                      {playerRow.display_name}
                      <span className="text-amber-500 ml-1 text-xs">(εσύ)</span>
                    </td>
                    <td className={lbTdScore}>{playerRow.score}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

        </div>

        {/* ── Footer: play-this-puzzle link ─────────────────────────────── */}
        {!isViewingCurrentPuzzle && selectedDate <= today && (
          <div className="px-5 py-3 border-t border-stone-100 text-center">
            <Link
              href={`/leksokipos?puzzle=${selectedDate}`}
              onClick={onClose}
              className="text-sm text-stone-600 underline hover:text-stone-800 transition-colors"
            >
              Παίξε αυτό το παζλ →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
