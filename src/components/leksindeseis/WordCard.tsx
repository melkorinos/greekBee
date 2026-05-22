// WordCard — a single selectable word tile in the Connections grid.

interface WordCardProps {
  word:       string;
  selected:   boolean;
  disabled?:  boolean;
  onSelect:   (word: string) => void;
}

export function WordCard({ word, selected, disabled = false, onSelect }: WordCardProps) {
  return (
    <button
      onClick={() => !disabled && onSelect(word)}
      disabled={disabled}
      aria-pressed={selected}
      data-testid={`word-card-${word}`}
      className={[
        "flex items-center justify-center",
        "h-14 w-full rounded-lg border-2",
        "text-sm font-bold uppercase tracking-wide",
        "transition-colors duration-100 select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer active:opacity-80",
        selected
          ? "bg-stone-700 border-stone-700 text-white"
          : "bg-white border-stone-300 text-stone-800 hover:border-stone-500",
      ].join(" ")}
    >
      {word}
    </button>
  );
}
