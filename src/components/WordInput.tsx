"use client";

// WordInput — shows the letters the player has typed so far.
// The centre letter is highlighted so it's clear it's present.

interface WordInputProps {
  value: string;
  centerLetter: string;
}

// ── Class constants ──────────────────────────────────────────────────────────
const styles = {
  container:    "min-h-[2.5rem] flex items-center justify-center gap-0.5 text-3xl font-bold tracking-widest uppercase",
  placeholder:  "text-stone-300",
  centerLetter: "text-yellow-500",   // mandatory centre letter — highlighted
  outerLetter:  "text-stone-800",
};

export function WordInput({ value, centerLetter }: WordInputProps) {
  return (
    <div data-testid="word-input" className={styles.container}>
      {value.length === 0 ? (
        // Placeholder dash when nothing is typed
        <span className={styles.placeholder}>—</span>
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
    </div>
  );
}
