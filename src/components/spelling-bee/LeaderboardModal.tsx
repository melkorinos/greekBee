// LeaderboardModal — bottom-sheet leaderboard for daily Spelling Bee puzzles.
//
// Features:
//   - Date picker to browse any day's leaderboard (defaults to current puzzle date)
//   - Top 20 rows sorted by score; player's own row is highlighted
//   - If the player is outside the top 20, their row is pinned below a dashed separator
//   - Inline display-name editor (persisted to localStorage via onSaveName)
//   - "Παίξε αυτό το παζλ" link to jump to any past puzzle
//   - Auto-polls every 5 min via useLeaderboard (only while modal is open)

"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";

interface LeaderboardModalProps {
  isOpen:          boolean;
  defaultPuzzleId: string; // the current daily puzzle's date string e.g. "2026-05-18"
  deviceId:        string;
  displayName:     string;
  onSaveName:      (name: string) => void;
  onClose:         () => void;
}

export function LeaderboardModal({
  isOpen,
  defaultPuzzleId,
  deviceId,
  displayName,
  onSaveName,
  onClose,
}: LeaderboardModalProps) {
  const [selectedDate, setSelectedDate] = useState(defaultPuzzleId);
  const [nameInput,    setNameInput]    = useState(displayName);

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

  // ── Styles ─────────────────────────────────────────────────────────────────

  const rowBase    = "border-t border-stone-50 text-sm";
  const rowPlayer  = "bg-amber-50 font-semibold";
  const tdRank     = "py-1.5 pr-2 text-stone-400 text-xs w-6 tabular-nums";
  const tdName     = "py-1.5 text-stone-700";
  const tdScore    = "py-1.5 text-right font-mono text-stone-800 pl-4";

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
          <label className="block text-xs font-medium text-stone-500 mb-1.5">
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
              className="flex-1 border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <button
              onClick={handleSaveName}
              disabled={!nameDirty}
              className="px-3 py-1.5 bg-stone-800 text-white text-sm rounded-lg disabled:opacity-40 hover:bg-stone-700 active:bg-stone-900 transition-colors"
            >
              {!nameDirty && displayName ? "✓" : "Αποθήκευση"}
            </button>
          </div>
        </div>

        {/* ── Date picker ────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-3">
          <label className="text-xs font-medium text-stone-500 shrink-0">
            Ημερομηνία
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="border border-stone-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 flex-1 min-w-0"
          />
          <button
            onClick={() => void refresh()}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors shrink-0"
            aria-label="Ανανέωση"
          >
            ↻
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
              {!isViewingCurrentPuzzle && (
                <Link
                  href={`/spelling-bee?puzzle=${selectedDate}`}
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
                    className={`${rowBase} ${row.isPlayer ? rowPlayer : ""}`}
                  >
                    <td className={tdRank}>{row.rank}</td>
                    <td className={tdName}>
                      {row.display_name}
                      {row.isPlayer && (
                        <span className="text-amber-500 ml-1 text-xs">(εσύ)</span>
                      )}
                    </td>
                    <td className={tdScore}>{row.score}</td>
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
                  <tr className={`${rowBase} ${rowPlayer}`}>
                    <td className={tdRank}>{playerRow.rank}</td>
                    <td className={tdName}>
                      {playerRow.display_name}
                      <span className="text-amber-500 ml-1 text-xs">(εσύ)</span>
                    </td>
                    <td className={tdScore}>{playerRow.score}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

        </div>

        {/* ── Footer: play-this-puzzle link ─────────────────────────────── */}
        {!isViewingCurrentPuzzle && (
          <div className="px-5 py-3 border-t border-stone-100 text-center">
            <Link
              href={`/spelling-bee?puzzle=${selectedDate}`}
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
