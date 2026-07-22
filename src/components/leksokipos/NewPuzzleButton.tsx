"use client";

// NewPuzzleButton — opens the letter-picker modal so the player can build a
// custom puzzle or pick a random one.

import { useState } from "react";
import { greekToGreeklish } from "@/lib/greeklish";
import { LetterPickerModal } from "@/components/shared/LetterPickerModal";
import { tooltipBubble } from "@/styles/recipes";

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
        <div className={tooltipBubble}>
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
