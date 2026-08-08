"use client";

// GameHelpButton — the "?" rules trigger in every game's header row.
//
// Sibling of GameHeaderTrophyButton: both wrap HeaderIconButton so the two
// header circles are the same size, weight and tooltip treatment everywhere.
// The label/tooltip/className trio below was pasted byte-identical in six page
// clients and in the shared HowToPlayModal's own trigger — this is now the one
// place it lives.

import { HeaderIconButton } from "./HeaderIconButton";

interface GameHelpButtonProps {
  onClick: () => void;
}

export function GameHelpButton({ onClick }: GameHelpButtonProps) {
  return (
    <HeaderIconButton
      onClick={onClick}
      ariaLabel="Πώς να παίξεις"
      tooltip="Κανόνες"
      className="text-sm font-bold"
    >
      ?
    </HeaderIconButton>
  );
}
