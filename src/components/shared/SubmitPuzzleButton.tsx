"use client";

import { useState } from "react";
import { CommunityLeksiarxeioSubmitModal } from "@/components/leksiarxeio/CommunityLeksiarxeioSubmitModal";
import { CommunityLeksindeseisSubmitModal } from "@/components/leksindeseis/CommunityLeksindeseisSubmitModal";

interface Props {
  game: "leksiarxeio" | "leksindeseis";
}

export function SubmitPuzzleButton({ game }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); setOpen(true); }}
        aria-label="Υποβολή Παζλ"
        title="Υποβολή Παζλ"
        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-base leading-none"
      >
        ✏️
      </button>

      {game === "leksiarxeio" && (
        <CommunityLeksiarxeioSubmitModal isOpen={open} onClose={() => setOpen(false)} />
      )}
      {game === "leksindeseis" && (
        <CommunityLeksindeseisSubmitModal isOpen={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
