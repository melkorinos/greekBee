"use client";

// WordInput — shows the letters the player has typed so far.
// The centre letter is highlighted so it's clear it's present.
// When canSubmit is true (word >=4 letters), a green submit button appears
// inline so players can submit without needing a separate button row.

interface WordInputProps {
  value:        string;
  centerLetter: string;
  /** Called when the inline submit button is tapped */
  onSubmit?:    () => void;
  /** When true the green submit button is shown */
  canSubmit?:   boolean;
}

// Class constants
const styles = {
  container:    "min-h-[2.5rem] flex items-center justify-center gap-0.5 text-3xl font-bold tracking-widest uppercase",
  placeholder:  "text-stone-300",
  centerLetter: "text-yellow-500",
  outerLetter:  "text-stone-800",
};

export function WordInput({ value, centerLetter, onSubmit, canSubmit = false }: WordInputProps) {
  return (
    <div data-testid="word-input" className={styles.container}>
      {value.length === 0 ? (
        <span className={styles.placeholder}>-</span>
      ) : (
        value.split("").map((ch, i) => (
          <span
            key={i}
            data-testid="word-input-letter"
            className={ch === centerLetter ? styles.centerLetter : styles.outerLetter}
          >
            {ch.toUpperCase()}
          </span>
        ))
      )}

      {canSubmit && onSubmit && (
        <button
          onClick={onSubmit}
          data-testid="btn-enter"
          aria-label="Submission"
          className="ml-3 flex items-center justify-center w-9 h-9 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-lg font-bold shadow-sm transition-colors"
        >
          &#9166;
        </button>
      )}
    </div>
  );
}
