"use client";

// GameHeaderTrophyButton — the 🏆 leaderboard trigger for a game's own header
// row. Pairs with HowToPlayModal's "?" trigger; both use HeaderIconButton so
// every game's header buttons are the same circle, same size, same emoji.

import { HeaderIconButton } from "./HeaderIconButton";

interface GameHeaderTrophyButtonProps {
  onClick: () => void;
}

export function GameHeaderTrophyButton({ onClick }: GameHeaderTrophyButtonProps) {
  return (
    <HeaderIconButton
      onClick={onClick}
      ariaLabel="Πίνακας σκορ"
      tooltip="Πίνακας σκορ"
      className="text-trophy"
    >
      🏆
    </HeaderIconButton>
  );
}
