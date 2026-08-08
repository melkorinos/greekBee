"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StavroleksoGrid, computeHighlightedCells, computeSolvedCells } from "@/games/stavrolekso/StavroleksoGrid";
import { makeBlackSet, getSlotCells, getSlotLength, normalizeAndCompare } from "@/games/stavrolekso/lib";
import type { Direction, StavroleksoPuzzleData, StavroleksoSession } from "@/games/stavrolekso/types";

function storageKey(id: number): string {
  return `stavrolekso-${id}`;
}

function loadSession(id: number): StavroleksoSession {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (raw) return JSON.parse(raw) as StavroleksoSession;
  } catch { /* ignore */ }
  return { cells: {}, solvedSlots: [] };
}

function saveSession(id: number, session: StavroleksoSession) {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(session));
  } catch { /* ignore */ }
}

interface Props {
  id: number;
  puzzle: StavroleksoPuzzleData & { title: string | null; submitter_name: string };
}

export function StavroleksoPlayer({ id, puzzle }: Props) {
  const { width, height, blackSquares, slots } = puzzle;
  const blackSet = useMemo(() => makeBlackSet(blackSquares), [blackSquares]);

  const [cells, setCells]           = useState<Record<string, string>>(() => loadSession(id).cells);
  const [solvedSlots, setSolvedSlots] = useState<number[]>(() => loadSession(id).solvedSlots);
  const [selectedSlot, setSelectedSlot] = useState<{ number: number; direction: Direction } | null>(null);
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);

  // Persist whenever cells or solvedSlots change
  useEffect(() => {
    saveSession(id, { cells, solvedSlots });
  }, [id, cells, solvedSlots]);

  const highlightedCells = useMemo(
    () => computeHighlightedCells(selectedSlot, slots, width, height, blackSet),
    [selectedSlot, slots, width, height, blackSet],
  );

  const solvedCells = useMemo(
    () => computeSolvedCells(solvedSlots, slots, width, height, blackSet),
    [solvedSlots, slots, width, height, blackSet],
  );

  function handleCellClick(row: number, col: number) {
    const key = `${row}_${col}`;
    if (blackSet.has(key)) return;

    const cellSlots = slots.filter((s) => {
      const sc = getSlotCells(s.direction, s.startRow, s.startCol, width, height, blackSet);
      return sc.includes(key);
    });
    if (cellSlots.length === 0) return;

    if (selectedSlot) {
      const currentIdx = cellSlots.findIndex(
        (s) => s.number === selectedSlot.number && s.direction === selectedSlot.direction,
      );
      if (currentIdx !== -1) {
        const nextSlot = cellSlots[(currentIdx + 1) % cellSlots.length];
        setSelectedSlot({ number: nextSlot.number, direction: nextSlot.direction });
        setActiveCellKey(key);
        return;
      }
    }

    const preferred = cellSlots.find((s) => s.direction === "across") ?? cellSlots[0];
    setSelectedSlot({ number: preferred.number, direction: preferred.direction });
    setActiveCellKey(key);
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedSlot || !activeCellKey) return;

    const slot = slots.find((s) => s.number === selectedSlot.number && s.direction === selectedSlot.direction);
    if (!slot) return;

    // Don't allow editing solved slots
    if (solvedSlots.includes(slot.number)) return;

    const slotCells = getSlotCells(slot.direction, slot.startRow, slot.startCol, width, height, blackSet);
    const cellIdx   = slotCells.indexOf(activeCellKey);

    if (e.key === "Backspace") {
      e.preventDefault();
      if (cells[activeCellKey]) {
        setCells((prev) => { const next = { ...prev }; delete next[activeCellKey]; return next; });
      } else if (cellIdx > 0) {
        const prevKey = slotCells[cellIdx - 1];
        setActiveCellKey(prevKey);
        setCells((prev) => { const next = { ...prev }; delete next[prevKey]; return next; });
      }
      return;
    }

    const letter = e.key.toUpperCase();
    if (letter.length === 1 && /[Α-ΩA-Z]/u.test(letter)) {
      e.preventDefault();
      const newCells = { ...cells, [activeCellKey]: letter };
      setCells(newCells);

      // Check if slot is now complete
      const updatedInput = slotCells.map((k) => (k === activeCellKey ? letter : cells[k] ?? "")).join("");
      if (updatedInput.length === slotCells.length && normalizeAndCompare(updatedInput, slot.answer)) {
        setSolvedSlots((prev) => prev.includes(slot.number) ? prev : [...prev, slot.number]);
      }

      // Advance cursor
      if (cellIdx < slotCells.length - 1) {
        setActiveCellKey(slotCells[cellIdx + 1]);
      } else {
        // Auto-advance to next unsolved slot
        const slotNumbers = [...new Set(slots.map((s) => s.number))];
        const currentNumIdx = slotNumbers.indexOf(selectedSlot.number);
        for (let i = 1; i <= slotNumbers.length; i++) {
          const nextNum  = slotNumbers[(currentNumIdx + i) % slotNumbers.length];
          const nextSlot = slots.find((s) => s.number === nextNum);
          if (nextSlot && !solvedSlots.includes(nextNum)) {
            setSelectedSlot({ number: nextSlot.number, direction: nextSlot.direction });
            const nextCells = getSlotCells(nextSlot.direction, nextSlot.startRow, nextSlot.startCol, width, height, blackSet);
            setActiveCellKey(nextCells[0] ?? null);
            break;
          }
        }
      }
    }
  }, [selectedSlot, activeCellKey, slots, cells, solvedSlots, width, height, blackSet]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const selectedSlotDef = selectedSlot
    ? slots.find((s) => s.number === selectedSlot.number && s.direction === selectedSlot.direction)
    : null;

  const slotLen = selectedSlotDef
    ? getSlotLength(selectedSlotDef.direction, selectedSlotDef.startRow, selectedSlotDef.startCol, width, height, blackSet)
    : 0;

  const totalSlots  = [...new Set(slots.map((s) => s.number))].length;
  const solvedCount = solvedSlots.length;
  const isComplete  = solvedCount === totalSlots;

  return (
    <div className="w-full max-w-game space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{solvedCount}/{totalSlots} slots λυμένα</span>
        {isComplete && <span className="text-correct font-semibold">✓ Ολοκληρώθηκε!</span>}
      </div>

      {/* Grid */}
      <div style={{ containerType: "inline-size" }}>
        <StavroleksoGrid
          width={width}
          height={height}
          blackSquares={blackSquares}
          slots={slots}
          cellValues={cells}
          highlightedCells={highlightedCells}
          activeCellKey={activeCellKey}
          solvedCells={solvedCells}
          onCellClick={handleCellClick}
        />
      </div>

      {/* Clue panel */}
      {selectedSlotDef ? (
        <div className="border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-semibold text-muted">
            {selectedSlotDef.number} {selectedSlotDef.direction === "across" ? "Οριζόντια" : "Κάθετα"} ({slotLen} γράμμ.)
          </p>
          <p className="text-sm text-foreground">
            {selectedSlotDef.clue || <span className="italic text-muted">Χωρίς υπόδειξη</span>}
          </p>
          {solvedSlots.includes(selectedSlotDef.number) && (
            <p className="text-xs text-correct font-semibold">✓ Σωστό!</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted text-center">
          Πάτησε ένα κελί για να επιλέξεις slot.
        </p>
      )}

      {/* Across + Down clue lists */}
      <div className="grid grid-cols-2 gap-3">
        {(["across", "down"] as const).map((dir) => (
          <div key={dir}>
            <p className="text-xs font-semibold text-muted mb-1">
              {dir === "across" ? "Οριζόντια" : "Κάθετα"}
            </p>
            <ul className="space-y-1">
              {slots.filter((s) => s.direction === dir).map((s) => (
                <li key={`${s.number}-${s.direction}`}>
                  <button
                    onClick={() => {
                      const sc = getSlotCells(s.direction, s.startRow, s.startCol, width, height, blackSet);
                      setSelectedSlot({ number: s.number, direction: s.direction });
                      setActiveCellKey(sc[0] ?? null);
                    }}
                    className={`text-left text-xs w-full px-1 py-0.5 rounded transition-colors ${
                      selectedSlot?.number === s.number && selectedSlot?.direction === s.direction
                        ? "bg-blue-100 dark:bg-blue-900 text-foreground"
                        : solvedSlots.includes(s.number)
                          ? "text-correct line-through"
                          : "text-muted hover:bg-surface-raised"
                    }`}
                  >
                    <span className="font-semibold">{s.number}.</span> {s.clue || "—"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
