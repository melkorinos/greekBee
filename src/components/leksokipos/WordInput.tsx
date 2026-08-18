"use client";

// WordInput — shows the letters the player has typed so far.
// The centre letter is highlighted so it's clear it's present.
// The submit button sits inline beside the letters and is ALWAYS rendered, so the
// player has a fixed target to aim at while typing: green and clickable once the
// word is long enough (canSubmit), muted and disabled below that.

import { SubmitMark } from "./icons";
import { btnSquircleDisabled, btnSquircleGo, squircleBox } from "./styles";

interface WordInputProps {
  value:        string;
  centerLetter: string;
  /** Called when the inline submit button is tapped */
  onSubmit?:    () => void;
  /** When true the submit button is green and enabled; otherwise muted + disabled */
  canSubmit?:   boolean;
}

// Class constants
const styles = {
  container: "min-h-[2.5rem] flex items-center justify-center gap-0.5 text-3xl font-bold tracking-widest uppercase",
};

export function WordInput({ value, centerLetter, onSubmit, canSubmit = false }: WordInputProps) {
  return (
    <div data-testid="word-input" className={styles.container}>
      {value.length === 0 ? (
        // Empty-input placeholder — muted token.
        <span className="text-muted">-</span>
      ) : (
        value.split("").map((ch, i) => (
          <span
            key={i}
            data-testid="word-input-letter"
            // Centre letter is the golden accent; outer letters use the foreground token.
            className={ch === centerLetter ? "text-accent" : "text-foreground"}
          >
            {ch.toUpperCase()}
          </span>
        ))
      )}

      {onSubmit && (
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          data-testid="btn-enter"
          aria-label="Καταχώρηση"
          className={`ml-3 ${squircleBox} ${canSubmit ? btnSquircleGo : btnSquircleDisabled}`}
        >
          <SubmitMark />
        </button>
      )}
    </div>
  );
}
