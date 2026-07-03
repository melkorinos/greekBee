"use client";

// NewPuzzleButton — opens the letter-picker modal so the player can build a
// custom puzzle or pick a random one.

import { useState } from "react";
import { greekToGreeklish } from "@/lib/greeklish";
import { LetterPickerModal } from "@/components/shared/LetterPickerModal";

export function NewPuzzleButton() {
  const [modalOpen, setModalOpen] = useState(false);

  function handleConfirm(center: string, outer: string[]) {
    setModalOpen(false);
    const c = greekToGreeklish(center);
    const o = greekToGreeklish(outer.join(""));
    window.location.href = `/leksokipos/${c}/${o}`;
  }

  return (
    <>
      <div className="relative group">
        <button
          onClick={() => setModalOpen(true)}
          aria-label="Νέο Παζλ"
          data-testid="btn-new-puzzle"
          className="flex items-center justify-center rounded-full border border-border text-muted text-sm font-medium px-3 h-8 hover:bg-surface-raised active:bg-border transition-colors"
        >
          🎲
        </button>
        <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-inverted px-2.5 py-1 text-xs text-inverted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10">
          Νέο Παζλ
        </div>
      </div>

      <LetterPickerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
