// LeksiarxeioLeaderboardModal — bottom-sheet leaderboard for daily Leksiarxeio.
//
// Score = sum of attempts across all 5 lengths (4–8) for a given day.
// Lower score = better rank.  Missing lengths count as 7 (penalty).
// Mirrors the Leksokipos LeaderboardModal in structure and style.

"use client";

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
import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import type { LeaderboardUrlBuilder } from "@/hooks/useLeaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";

// Re-use Leksokipos style tokens — identical visual language


// ── Day helpers ───────────────────────────────────────────────────────────────

const GREEK_DAYS = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"] as const;

function getLast7Dates(today: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LeksiarxeioLeaderboardModalProps {
  isOpen:       boolean;
  today:        string;   // YYYY-MM-DD — the current game date
  deviceId:     string;
  displayName:  string;
  onSaveName:   (name: string) => void;
  onClose:      () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LeksiarxeioLeaderboardModal({
  isOpen,
  today,
  deviceId,
  displayName,
  onSaveName,
  onClose,
}: LeksiarxeioLeaderboardModalProps) {
  const recentDates = getLast7Dates(today);

  const [selectedDate, setSelectedDate] = useState(today);
  const [nameInput,    setNameInput]    = useState(displayName);

  // Sync name input when parent updates it
  useEffect(() => { setNameInput(displayName); }, [displayName]);

  // Reset to today whenever modal opens
  useEffect(() => {
    if (isOpen) setSelectedDate(today);
  }, [isOpen, today]);

  // URL builder for the Leksiarxeio leaderboard endpoint.
  // Uses ?date= (not ?puzzle_date=) to match the leksiarxeio-scores route shape.
  const buildUrl: LeaderboardUrlBuilder = useMemo(
    () => (date, deviceId) => {
      const params = new URLSearchParams({ date });
      if (deviceId) params.set("deviceId", deviceId);
      return `/api/leksiarxeio-scores?${params.toString()}`;
    },
    []
  );

  const { data, isLoading, error, refresh } = useLeaderboard(
    selectedDate,
    deviceId,
    isOpen,    // pause polling when modal is closed
    buildUrl
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
  const isViewingToday       = selectedDate === today;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Πίνακας Σκορ Leksiarxeio"
      onClick={handleOverlayClick}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Bottom-sheet panel */}
      <div className="relative bg-white rounded-t-2xl w-full max-w-sm max-h-[82vh] flex flex-col shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-base font-bold text-stone-800">🏆 Πίνακας Σκορ</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Άθροισμα προσπαθειών (4–8 γράμματα) · χαμηλότερο = καλύτερο
            </p>
          </div>
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

        {/* ── Day strip ──────────────────────────────────────────────────── */}
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
                      ? "bg-green-500 text-white"
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
            <p className="text-center text-stone-400 text-sm py-10">Φόρτωση…</p>
          )}

          {!isLoading && error && (
            <p className="text-center text-red-400 text-sm py-10">{error}</p>
          )}

          {!isLoading && !error && top20.length === 0 && (
            <div className="text-center py-10">
              <p className="text-stone-400 text-sm mb-3">
                Κανείς δεν έχει παίξει αυτή την ημέρα ακόμα.
              </p>
              {!isViewingToday && selectedDate <= today && (
                <Link
                  href="/leksiarxeio"
                  className="text-stone-600 text-sm underline hover:text-stone-800"
                >
                  Παίξε σήμερα →
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
                  <th className="text-right pb-2 pl-4">Προσπάθειες</th>
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
                        <span className="text-green-600 ml-1 text-xs">(εσύ)</span>
                      )}
                    </td>
                    <td className={lbTdScore}>{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pinned player row — only when outside top 20 */}
          {!isLoading && playerRow && (
            <>
              <div className="border-t-2 border-dashed border-stone-200 my-3" />
              <table className="w-full">
                <tbody>
                  <tr className={`${lbRowBase} ${lbRowPlayer}`}>
                    <td className={lbTdRank}>{playerRow.rank}</td>
                    <td className={lbTdName}>
                      {playerRow.display_name}
                      <span className="text-green-600 ml-1 text-xs">(εσύ)</span>
                    </td>
                    <td className={lbTdScore}>{playerRow.score}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
