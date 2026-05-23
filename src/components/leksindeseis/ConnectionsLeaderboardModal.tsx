"use client";

// ConnectionsLeaderboardModal — leaderboard for daily Connections puzzles.
// Score = mistakesRemaining (4 = perfect, 1 = barely won). Higher = better.
// Only winning scores appear; lost games are not on the board.

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
import { useEffect, useState } from "react";

import type { LeaderboardUrlBuilder } from "@/hooks/useLeaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";

const buildUrl: LeaderboardUrlBuilder = (date, deviceId) => {
  const params = new URLSearchParams({ game_id: "leksindeseis", puzzle_date: date });
  if (deviceId) params.set("deviceId", deviceId);
  return `/api/game-scores?${params.toString()}`;
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface ConnectionsLeaderboardModalProps {
  isOpen:      boolean;
  date:        string;   // YYYY-MM-DD
  deviceId:    string;
  displayName: string;
  score:       number;   // 0 when still playing / lost; 1–4 when won
  onSaveName:  (name: string) => void;
  onClose:     () => void;
}

// ── Score display ──────────────────────────────────────────────────────────────

function formatScore(score: number): string {
  return `${score}/4`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ConnectionsLeaderboardModal({
  isOpen,
  date,
  deviceId,
  displayName,
  score,
  onSaveName,
  onClose,
}: ConnectionsLeaderboardModalProps) {
  const { data, isLoading, error } = useLeaderboard(date, deviceId, isOpen, buildUrl);

  const [nameInput, setNameInput] = useState(displayName);
  useEffect(() => { setNameInput(displayName); }, [displayName]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-t-2xl p-5 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-800">🏆 Κατάταξη</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-xl leading-none"
            aria-label="Κλείσιμο"
          >
            ✕
          </button>
        </div>

        {/* Date label */}
        <p className="text-xs text-stone-500 mb-3">
          {new Date(date + "T00:00:00").toLocaleDateString("el-GR", {
            weekday: "long", day: "numeric", month: "long",
          })}
          {score > 0 && (
            <span className="ml-2 font-semibold text-green-700">
              Σκορ σου: {formatScore(score)}
            </span>
          )}
        </p>

        {/* Leaderboard table */}
        {isLoading && (
          <p className="text-center text-stone-400 text-sm py-4">Φόρτωση…</p>
        )}
        {error && (
          <p className="text-center text-red-500 text-sm py-4">Σφάλμα φόρτωσης</p>
        )}
        {!isLoading && !error && (
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-stone-400 text-xs border-b border-stone-100">
                <th className={lbTdRank}>#</th>
                <th className={lbTdName}>Παίκτης</th>
                <th className={lbTdScore}>Σκορ</th>
              </tr>
            </thead>
            <tbody>
              {data.top20.map((row) => (
                <tr
                  key={row.rank}
                  className={row.isPlayer ? lbRowPlayer : lbRowBase}
                >
                  <td className={lbTdRank}>{row.rank}</td>
                  <td className={lbTdName}>{row.display_name}</td>
                  <td className={lbTdScore}>{formatScore(row.score)}</td>
                </tr>
              ))}
              {data.playerRow && (
                <tr className={lbRowPlayer}>
                  <td className={lbTdRank}>{data.playerRow.rank}</td>
                  <td className={lbTdName}>{data.playerRow.display_name}</td>
                  <td className={lbTdScore}>{formatScore(data.playerRow.score)}</td>
                </tr>
              )}
              {data.top20.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-stone-400 py-4 text-xs">
                    Κανείς δεν έχει παίξει ακόμα σήμερα
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Display name editor */}
        <div className="border-t border-stone-100 pt-3">
          <label className={labelClass}>Όνομα στον πίνακα</label>
          <div className="flex gap-2 mt-1">
            <input
              className={inputCompactClass}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={30}
              placeholder="Ανώνυμος"
            />
            <button
              className={btnPrimaryCompact}
              onClick={() => onSaveName(nameInput.trim())}
            >
              Αποθήκευση
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
