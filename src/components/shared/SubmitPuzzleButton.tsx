"use client";

import { useState } from "react";
import { CommunityLeksindeseisSubmitModal } from "@/components/leksindeseis/CommunityLeksindeseisSubmitModal";
import { btnHeaderIcon, btnHeaderIconSize } from "@/styles/recipes";

interface Props {
  game: "leksindeseis";
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

      {game === "leksindeseis" && (
        <CommunityLeksindeseisSubmitModal isOpen={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
