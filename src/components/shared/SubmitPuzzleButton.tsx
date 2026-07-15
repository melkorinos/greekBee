"use client";

import { useState } from "react";
import { CommunityLeksiarxeioSubmitModal } from "@/components/leksiarxeio/CommunityLeksiarxeioSubmitModal";
import { CommunityLeksindeseisSubmitModal } from "@/components/leksindeseis/CommunityLeksindeseisSubmitModal";
import { CommunityVresTinFrasiSubmitModal } from "@/components/vrestifrasi/CommunityVresTinFrasiSubmitModal";
import { btnHeaderIcon, btnHeaderIconSize } from "@/styles/recipes";

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
        className={`${btnHeaderIconSize} ${btnHeaderIcon} text-base`}
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
