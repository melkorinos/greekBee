"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StavroleksoGrid, computeHighlightedCells } from "@/games/stavrolekso/StavroleksoGrid";
import {
  autoNumberSlots,
  isConnected,
  makeBlackSet,
  getSlotCells,
  getSlotLength,
  EDIT_PIN_PATTERN,
  EDIT_PIN_ERROR,
  validateStavroleksoData,
} from "@/games/stavrolekso/lib";
import type { Direction, SlotDef } from "@/games/stavrolekso/types";

type Phase = 1 | 2 | 3;
type GridSize = 9 | 13 | 15;

interface Confirmation {
  id: number;
  pin: string;
  submitterName: string;
  title: string;
}

function randomPin(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── Resume form ───────────────────────────────────────────────────────────────

function ResumeForm({ onLoaded }: {
  onLoaded: (id: number, pin: string, data: {
    title: string | null;
    submitter_name: string;
    data: { width: number; height: number; blackSquares: [number, number][]; slots: SlotDef[] };
  }) => void;
}) {
  const [puzzleId, setPuzzleId] = useState("");
  const [pin, setPin]           = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleResume() {
    setError("");
    setLoading(true);
    try {
      const res  = await fetch(`/api/community-puzzles/stavrolekso/${puzzleId.trim()}`);
      if (!res.ok) { setError("Το παζλ δεν βρέθηκε."); return; }
      const json = await res.json() as { puzzle: { title: string | null; submitter_name: string; status: string; data: { width: number; height: number; blackSquares: [number, number][]; slots: SlotDef[] } } };
      const puzzle = json.puzzle;
      if (puzzle.status !== "pending") { setError("Το παζλ δεν είναι πλέον επεξεργάσιμο."); return; }
      onLoaded(Number(puzzleId.trim()), pin, puzzle);
    } catch {
      setError("Σφάλμα σύνδεσης.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">Συνέχισε παζλ</p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="ID παζλ"
          value={puzzleId}
          onChange={(e) => setPuzzleId(e.target.value)}
          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-surface-raised text-foreground"
        />
        <input
          type="text"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-28 border border-border rounded-lg px-3 py-2 text-sm bg-surface-raised text-foreground"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        disabled={!puzzleId.trim() || !pin || loading}
        onClick={handleResume}
        className="w-full py-2 rounded-lg bg-inverted text-inverted-foreground text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-colors"
      >
        {loading ? "Φόρτωση…" : "Φόρτωσε"}
      </button>
    </div>
  );
}

// ── Confirmation screen ───────────────────────────────────────────────────────

function ConfirmationScreen({ info, onNew }: { info: Confirmation; onNew: () => void }) {
  const [copiedId, setCopiedId]   = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  function copy(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="flex flex-col items-center min-h-screen bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-3xl">✅</p>
          <h1 className="text-xl font-bold text-foreground">Το παζλ στάλθηκε!</h1>
          <p className="text-sm text-muted">Βρίσκεται σε αναμονή έγκρισης από admin.</p>
        </div>

        <div className="border border-border rounded-xl p-5 space-y-4">
          <div>
            <p className="text-xs text-muted mb-1">ID Παζλ — κράτα το!</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-mono font-bold text-foreground">{info.id}</span>
              <button onClick={() => copy(String(info.id), setCopiedId)}
                className="text-xs px-2 py-1 rounded-lg bg-surface-raised text-muted hover:bg-border transition-colors">
                {copiedId ? "Αντιγράφηκε!" : "Αντιγραφή"}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted mb-1">Edit PIN — κράτα το!</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-foreground">{info.pin}</span>
              <button onClick={() => copy(info.pin, setCopiedPin)}
                className="text-xs px-2 py-1 rounded-lg bg-surface-raised text-muted hover:bg-border transition-colors">
                {copiedPin ? "Αντιγράφηκε!" : "Αντιγραφή"}
              </button>
            </div>
          </div>

          {info.submitterName && (
            <p className="text-sm text-muted">Από: {info.submitterName}</p>
          )}
        </div>

        <button onClick={onNew}
          className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-surface-raised transition-colors">
          Δημιούργησε νέο παζλ
        </button>
      </div>
    </main>
  );
}

// ── Main maker ────────────────────────────────────────────────────────────────

export default function StavroleksoMakerPage() {
  const [phase, setPhase]               = useState<Phase>(1);
  const [size, setSize]                 = useState<GridSize>(9);
  const [title, setTitle]               = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [editPin, setEditPin]           = useState(() => randomPin());
  const [copiedPin, setCopiedPin]       = useState(false);
  const [blackSquares, setBlackSquares] = useState<[number, number][]>([]);
  const [cells, setCells]               = useState<Record<string, string>>({});
  const [clues, setClues]               = useState<Record<string, string>>({});
  const [selectedSlot, setSelectedSlot] = useState<{ number: number; direction: Direction } | null>(null);
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [submitError, setSubmitError]   = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [resumeId, setResumeId]         = useState<number | null>(null);
  const [resumePin, setResumePin]       = useState<string>("");
  const clueInputRef = useRef<HTMLInputElement>(null);

  function handleCopyPin() {
    navigator.clipboard.writeText(editPin).then(() => {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    });
  }


  const slots = useMemo(
    () => autoNumberSlots(size, size, blackSquares),
    [size, blackSquares],
  );

  const blackSet = useMemo(() => makeBlackSet(blackSquares), [blackSquares]);

  const connected = useMemo(
    () => isConnected(size, size, blackSquares),
    [size, blackSquares],
  );

  const highlightedCells = useMemo(
    () => computeHighlightedCells(selectedSlot, slots, size, size, blackSet),
    [selectedSlot, slots, size, blackSet],
  );

  // Fully-filled slot answers (lowercased) paired with their cells. Only complete
  // words are candidates for the "not a real word" warning.
  const filledWords = useMemo(() => {
    if (phase !== 3) return [] as { word: string; cells: string[] }[];
    const result: { word: string; cells: string[] }[] = [];
    for (const slot of slots) {
      const slotCells = getSlotCells(slot.direction, slot.startRow, slot.startCol, size, size, blackSet);
      const word = slotCells.map((k) => cells[k] ?? "").join("").toLowerCase();
      if (word.length === slotCells.length && word.length > 0) {
        result.push({ word, cells: slotCells });
      }
    }
    return result;
  }, [phase, slots, cells, size, blackSet]);

  // Words confirmed (by the server dictionary) NOT to be real words. The check
  // runs server-side so the 811k-word dictionary never ships to the browser.
  const [invalidWords, setInvalidWords] = useState<Set<string>>(new Set());

  // Debounced dictionary check: re-validate the filled words shortly after the
  // grid stops changing. Soft warning only — failures are silently ignored.
  useEffect(() => {
    if (filledWords.length === 0) {
      setInvalidWords(new Set());
      return;
    }
    let ignore = false;
    const unique = [...new Set(filledWords.map((f) => f.word))];
    const handle = setTimeout(() => {
      fetch("/api/validate-words", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ words: unique }),
      })
        .then((res) => (res.ok ? res.json() : { invalid: [] }))
        .then((json: { invalid?: string[] }) => {
          if (!ignore) setInvalidWords(new Set((json.invalid ?? []).map((w) => w.toLowerCase())));
        })
        .catch(() => {});
    }, 350);
    return () => { ignore = true; clearTimeout(handle); };
  }, [filledWords]);

  // Warned cells: cells belonging to a filled word the server flagged as unknown.
  const warnedCells = useMemo<Set<string>>(() => {
    const warned = new Set<string>();
    for (const { word, cells: slotCells } of filledWords) {
      if (invalidWords.has(word)) slotCells.forEach((k) => warned.add(k));
    }
    return warned;
  }, [filledWords, invalidWords]);

  // ── Phase 2: toggle black squares ─────────────────────────────────────────

  function handlePhase2CellClick(row: number, col: number) {
    const key = `${row}_${col}`;
    setBlackSquares((prev) => {
      const exists = prev.some(([r, c]) => r === row && c === col);
      return exists ? prev.filter(([r, c]) => !(r === row && c === col)) : [...prev, [row, col]];
    });
    // If a black square was toggled, re-compute auto-numbering — slots derived reactively
    setCells({});
    setClues({});
    setSelectedSlot(null);
    setActiveCellKey(null);
    // Remove any cell values for this cell
    setCells((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  // ── Phase 3: slot selection and letter input ───────────────────────────────

  function handlePhase3CellClick(row: number, col: number) {
    const key = `${row}_${col}`;
    if (blackSet.has(key)) return;
    clueInputRef.current?.blur();

    // Find slots that contain this cell
    const cellSlots = slots.filter((s) => {
      const slotCells = getSlotCells(s.direction, s.startRow, s.startCol, size, size, blackSet);
      return slotCells.includes(key);
    });
    if (cellSlots.length === 0) return;

    if (selectedSlot) {
      const currentSlotIndex = cellSlots.findIndex(
        (s) => s.number === selectedSlot.number && s.direction === selectedSlot.direction,
      );
      if (currentSlotIndex !== -1) {
        // Cycle to next slot for this cell
        const nextSlot = cellSlots[(currentSlotIndex + 1) % cellSlots.length];
        setSelectedSlot({ number: nextSlot.number, direction: nextSlot.direction });
        setActiveCellKey(key);
        return;
      }
    }

    // Select first slot for this cell (prefer across)
    const preferred = cellSlots.find((s) => s.direction === "across") ?? cellSlots[0];
    setSelectedSlot({ number: preferred.number, direction: preferred.direction });
    setActiveCellKey(key);
  }

  // Keyboard handler for Phase 3
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (phase !== 3 || !selectedSlot || !activeCellKey) return;
    // Let the clue input handle its own keystrokes
    if (document.activeElement === clueInputRef.current) return;

    const slot = slots.find((s) => s.number === selectedSlot.number && s.direction === selectedSlot.direction);
    if (!slot) return;

    const slotCells = getSlotCells(slot.direction, slot.startRow, slot.startCol, size, size, blackSet);
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

    // Greek or Latin letter
    const letter = e.key.toUpperCase();
    if (letter.length === 1 && /[Α-ΩA-Z]/u.test(letter)) {
      e.preventDefault();
      setCells((prev) => ({ ...prev, [activeCellKey]: letter }));
      if (cellIdx < slotCells.length - 1) {
        setActiveCellKey(slotCells[cellIdx + 1]);
      } else {
        // Advance to next numbered slot
        const slotNumbers = [...new Set(slots.map((s) => s.number))];
        const currentNumIdx = slotNumbers.indexOf(selectedSlot.number);
        if (currentNumIdx < slotNumbers.length - 1) {
          const nextNum  = slotNumbers[currentNumIdx + 1];
          const nextSlot = slots.find((s) => s.number === nextNum);
          if (nextSlot) {
            setSelectedSlot({ number: nextSlot.number, direction: nextSlot.direction });
            const nextCells = getSlotCells(nextSlot.direction, nextSlot.startRow, nextSlot.startCol, size, size, blackSet);
            setActiveCellKey(nextCells[0] ?? null);
          }
        }
      }
    }
  }, [phase, selectedSlot, activeCellKey, slots, cells, size, blackSet]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Validation helpers ────────────────────────────────────────────────────

  function assembleSlots(): SlotDef[] {
    return slots.map((slot) => {
      const slotCells = getSlotCells(slot.direction, slot.startRow, slot.startCol, size, size, blackSet);
      const answer    = slotCells.map((k) => cells[k] ?? "").join("");
      const clueKey   = `${slot.number}-${slot.direction}`;
      return { ...slot, answer, clue: clues[clueKey] ?? "" };
    });
  }

  function validateSubmit(): string | null {
    if (!EDIT_PIN_PATTERN.test(editPin)) return EDIT_PIN_ERROR;
    // Authoring-only quality gates: connectivity + every slot filled.
    if (!connected) return "Τα λευκά κελιά δεν είναι συνεκτικά.";
    const assembled = assembleSlots();
    for (const s of assembled) {
      const len = getSlotLength(s.direction, s.startRow, s.startCol, size, size, blackSet);
      if (s.answer.length < len) return `Slot ${s.number} ${s.direction === "across" ? "Οριζόντια" : "Κάθετα"}: δεν έχει συμπληρωθεί.`;
    }
    // Wire invariants — the same module the submit + edit routes enforce.
    return validateStavroleksoData({ width: size, height: size, blackSquares, slots: assembled });
  }

  async function handleSubmit() {
    const err = validateSubmit();
    if (err) { setSubmitError(err); return; }

    setSubmitError("");
    setSubmitting(true);
    try {
      const assembled = assembleSlots();
      const payload = {
        title: title.trim() || undefined,
        submitter_name: submitterName.trim() || undefined,
        edit_pin: editPin,
        data: { width: size, height: size, blackSquares, slots: assembled },
      };

      let res: Response;
      if (resumeId !== null) {
        res = await fetch(`/api/community-puzzles/stavrolekso/${resumeId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ edit_pin: resumePin, data: payload.data, title: payload.title, submitter_name: payload.submitter_name }),
        });
        if (res.ok) {
          setConfirmation({ id: resumeId, pin: resumePin, submitterName: submitterName.trim(), title: title.trim() });
          return;
        }
      } else {
        res = await fetch("/api/community-puzzles/stavrolekso", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      }

      const json = await res.json() as { ok?: boolean; id?: number; error?: string };
      if (!res.ok) { setSubmitError(json.error ?? "Σφάλμα αποστολής."); return; }
      setConfirmation({ id: json.id!, pin: editPin, submitterName: submitterName.trim(), title: title.trim() });
    } catch {
      setSubmitError("Σφάλμα σύνδεσης.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setPhase(1); setSize(9); setTitle(""); setSubmitterName(""); setEditPin("");
    setBlackSquares([]); setCells({}); setClues({}); setSelectedSlot(null);
    setActiveCellKey(null); setSubmitError(""); setConfirmation(null);
    setResumeId(null); setResumePin("");
  }

  function handleResumeLoaded(id: number, pin: string, puzzle: {
    title: string | null; submitter_name: string;
    data: { width: number; height: number; blackSquares: [number, number][]; slots: SlotDef[] };
  }) {
    setResumeId(id);
    setResumePin(pin);
    setTitle(puzzle.title ?? "");
    setSubmitterName(puzzle.submitter_name);
    setEditPin(pin);
    const s = puzzle.data.width as GridSize;
    setSize(s);
    setBlackSquares(puzzle.data.blackSquares);
    // Restore cells from slot answers
    const restoredCells: Record<string, string> = {};
    const restoredClues: Record<string, string> = {};
    const bs = makeBlackSet(puzzle.data.blackSquares);
    for (const slot of puzzle.data.slots) {
      const slotCells = getSlotCells(slot.direction, slot.startRow, slot.startCol, s, s, bs);
      slot.answer.split("").forEach((letter, i) => {
        if (slotCells[i]) restoredCells[slotCells[i]] = letter;
      });
      if (slot.clue) restoredClues[`${slot.number}-${slot.direction}`] = slot.clue;
    }
    setCells(restoredCells);
    setClues(restoredClues);
    setPhase(3);
    // Pre-select first slot so the clue bar is immediately populated
    const firstSlot = puzzle.data.slots[0];
    if (firstSlot) setSelectedSlot({ number: firstSlot.number, direction: firstSlot.direction });
  }

  if (confirmation) return <ConfirmationScreen info={confirmation} onNew={resetAll} />;

  const selectedSlotDef = selectedSlot
    ? slots.find((s) => s.number === selectedSlot.number && s.direction === selectedSlot.direction)
    : null;
  const selectedClueKey = selectedSlotDef ? `${selectedSlotDef.number}-${selectedSlotDef.direction}` : null;

  // ── Phase 1 ───────────────────────────────────────────────────────────────

  if (phase === 1) {
    return (
      <main className="flex flex-col items-center min-h-screen bg-background px-4 py-8">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">✏️ Maker Stavrolekso</h1>
            <p className="text-sm text-muted mt-1">Δημιούργησε το δικό σου σταυρόλεξο.</p>
          </div>

          {/* Size picker */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Μέγεθος πλέγματος</p>
            <div className="flex gap-2">
              {([9, 13, 15] as const).map((s) => (
                <button key={s} onClick={() => setSize(s)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    size === s
                      ? "bg-inverted text-inverted-foreground border-inverted"
                      : "border-border text-muted hover:bg-surface-raised"
                  }`}
                >
                  {s}×{s}
                </button>
              ))}
            </div>
          </div>

          {/* Optional fields */}
          <div className="space-y-3">
            <input type="text" placeholder="Τίτλος (προαιρετικό)" value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface-raised text-foreground"
            />
            <input type="text" placeholder="Όνομα δημιουργού (προαιρετικό)" value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface-raised text-foreground"
            />
          </div>

          <button
            onClick={() => setPhase(2)}
            className="w-full py-3 rounded-xl bg-inverted text-inverted-foreground font-semibold disabled:opacity-40 hover:opacity-90 transition-colors"
          >
            Δημιούργησε πλέγμα →
          </button>

          <ResumeForm onLoaded={handleResumeLoaded} />
        </div>
      </main>
    );
  }

  // ── Phase 2 + 3 layout ────────────────────────────────────────────────────

  return (
    <main className="flex flex-col items-center min-h-screen bg-background px-4 py-6">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">
            {phase === 2 ? "Σχεδίασε πλέγμα" : "Συμπλήρωσε λέξεις"}
          </h1>
          <div className="flex gap-2">
            <button onClick={() => { setPhase(1); setBlackSquares([]); setCells({}); setClues({}); setSelectedSlot(null); setActiveCellKey(null); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:bg-surface-raised transition-colors">
              ← Αρχή
            </button>
            {phase === 2 && (
              <button onClick={() => {
                setPhase(3);
                const first = slots[0];
                if (first) setSelectedSlot({ number: first.number, direction: first.direction });
              }}
                className="text-xs px-3 py-1.5 rounded-lg bg-inverted text-inverted-foreground font-semibold hover:opacity-90 transition-colors">
                Λέξεις →
              </button>
            )}
            {phase === 3 && (
              <button onClick={() => setPhase(2)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:bg-surface-raised transition-colors">
                ← Πλέγμα
              </button>
            )}
          </div>
        </div>

        {/* PIN display */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted">Edit PIN:</span>
          <code className="font-mono font-semibold text-foreground bg-surface-raised px-1.5 py-0.5 rounded">{editPin}</code>
          <button
            onClick={handleCopyPin}
            className="px-2 py-0.5 rounded border border-border text-muted hover:bg-surface-raised transition-colors"
          >
            {copiedPin ? "✓ Αντιγράφηκε" : "Αντιγραφή"}
          </button>
        </div>

        {/* Connectivity warning */}
        {!connected && (
          <p className="text-xs font-semibold text-danger bg-danger/10 border border-danger/40 rounded-lg px-3 py-2">
            ⚠️ Τα λευκά κελιά δεν είναι συνεκτικά.
          </p>
        )}

        {/* Grid */}
        <div className="relative" style={{ containerType: "inline-size" }}>
          <StavroleksoGrid
            width={size}
            height={size}
            blackSquares={blackSquares}
            slots={slots}
            cellValues={cells}
            highlightedCells={phase === 3 ? highlightedCells : undefined}
            activeCellKey={phase === 3 ? activeCellKey : undefined}
            warnedCells={phase === 3 ? warnedCells : undefined}
            onCellClick={phase === 2 ? handlePhase2CellClick : handlePhase3CellClick}
          />
        </div>

        {/* Phase 3: clue bar — below the grid */}
        {phase === 3 && (
          <div className="border border-border rounded-xl px-3 py-2.5 flex items-center gap-3">
            <p className="text-xs font-semibold text-muted shrink-0 min-w-[90px]">
              {selectedSlotDef
                ? `${selectedSlotDef.number} ${selectedSlotDef.direction === "across" ? "Οριζόντια" : "Κάθετα"} (${getSlotLength(selectedSlotDef.direction, selectedSlotDef.startRow, selectedSlotDef.startCol, size, size, blackSet)}γρ.)`
                : "Επίλεξε slot"}
            </p>
            <input
              ref={clueInputRef}
              type="text"
              placeholder="Γράψε ερώτηση…"
              disabled={!selectedSlotDef}
              value={selectedClueKey ? (clues[selectedClueKey] ?? "") : ""}
              onChange={(e) => {
                if (selectedClueKey) setClues((prev) => ({ ...prev, [selectedClueKey]: e.target.value }));
              }}
              className="flex-1 min-w-0 border border-border rounded-lg px-2 py-1.5 text-sm bg-surface-raised text-foreground disabled:opacity-40"
            />
          </div>
        )}

        {/* Phase 3: slot list below grid */}
        {phase === 3 && (
          <div className="space-y-4">
            {(["across", "down"] as const).map((dir) => {
              const dirSlots = slots.filter((s) => s.direction === dir);
              if (dirSlots.length === 0) return null;
              return (
                <div key={dir}>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                    {dir === "across" ? "Οριζόντια" : "Κάθετα"}
                  </p>
                  <ul className="space-y-0.5">
                    {dirSlots.map((s) => {
                      const clueKey = `${s.number}-${s.direction}`;
                      const clueText = clues[clueKey] ?? "";
                      const isSelected = selectedSlot?.number === s.number && selectedSlot?.direction === s.direction;
                      return (
                        <li key={clueKey}>
                          <button
                            onClick={() => {
                              setSelectedSlot({ number: s.number, direction: s.direction });
                              const sc = getSlotCells(s.direction, s.startRow, s.startCol, size, size, blackSet);
                              setActiveCellKey(sc[0] ?? null);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-baseline gap-2 transition-colors ${
                              isSelected
                                ? "bg-blue-100 dark:bg-blue-900 text-foreground"
                                : "hover:bg-surface-raised text-muted"
                            }`}
                          >
                            <span className="font-semibold text-xs shrink-0 w-5 text-right">{s.number}.</span>
                            <span className={`truncate text-xs ${clueText ? "" : "italic text-muted"}`}>
                              {clueText || "—"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            {/* Submit */}
            {submitError && (
              <p className="text-xs text-danger bg-danger/10 border border-danger/40 rounded-lg px-3 py-2">
                {submitError}
              </p>
            )}
            <button
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full py-3 rounded-xl bg-inverted text-inverted-foreground font-semibold disabled:opacity-40 hover:opacity-90 transition-colors"
            >
              {submitting ? "Αποστολή…" : resumeId !== null ? "Ενημέρωσε παζλ" : "Υποβολή παζλ"}
            </button>
          </div>
        )}

        {/* Phase 2: slot count indicator */}
        {phase === 2 && slots.length > 0 && (
          <p className="text-xs text-muted text-center">
            {slots.filter((s) => s.direction === "across").length} Οριζόντια ·{" "}
            {slots.filter((s) => s.direction === "down").length} Κάθετα
          </p>
        )}
      </div>
    </main>
  );
}
