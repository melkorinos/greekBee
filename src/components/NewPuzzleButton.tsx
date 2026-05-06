"use client";

// NewPuzzleButton — navigates to a new random puzzle after a confirmation dialog.

interface NewPuzzleButtonProps {
  puzzleId: string;
  language: string;
}

export function NewPuzzleButton({ puzzleId, language }: NewPuzzleButtonProps) {
  function handleClick() {
    const confirmed = window.confirm("Θέλεις σίγουρα νέο παζλ; Θα χάσεις την πρόοδό σου.");
    if (confirmed) {
      window.location.href = `/?lang=${language}&random=1&exclude=${puzzleId}`;
    }
  }

  return (
    <div className="relative group">
      <button
        onClick={handleClick}
        aria-label="Νέο Παζλ"
        className="flex items-center justify-center rounded-full border border-stone-300 text-stone-600 text-sm font-medium px-3 h-8 hover:bg-stone-100 active:bg-stone-200 transition-colors"
      >
        🎲
      </button>
      <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-2.5 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
        Νέο Παζλ
      </div>
    </div>
  );
}
