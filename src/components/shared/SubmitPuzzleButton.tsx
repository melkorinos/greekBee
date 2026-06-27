"use client";

import { useState } from "react";
import { CommunityLeksiarxeioSubmitModal } from "@/components/leksiarxeio/CommunityLeksiarxeioSubmitModal";
import { CommunityLeksindeseisSubmitModal } from "@/components/leksindeseis/CommunityLeksindeseisSubmitModal";
import { CommunityVresTinFrasiSubmitModal } from "@/components/vrestifrasi/CommunityVresTinFrasiSubmitModal";

interface Props {
  game: "leksiarxeio" | "leksindeseis" | "vrestifrasi";
}

export function SubmitPuzzleButton({ game }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); setOpen(true); }}
        aria-label="Υποβολή Παζλ"
        title="Υποβολή Παζλ"
        className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised transition-colors text-base leading-none"
      >
        ➕
      </button>

      {game === "leksiarxeio" && (
        <CommunityLeksiarxeioSubmitModal isOpen={open} onClose={() => setOpen(false)} />
      )}
      {game === "leksindeseis" && (
        <CommunityLeksindeseisSubmitModal isOpen={open} onClose={() => setOpen(false)} />
      )}
      {game === "vrestifrasi" && (
        <CommunityVresTinFrasiSubmitModal isOpen={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
