// GuessTextInput — the free typed-text brand guess input for Λογοπαίγνιο.
//
// Deliberately a FREE text field: no autocomplete, no multiple choice — the
// player types the company name letter-for-letter (the reducer/evaluateGuess do
// the forgiving accent/case/whitespace matching against the accept-list). Mirrors
// posokanei's PriceInput: reuses the platform play-surface input look, commits on
// the "Μάντεψε" button or Enter, and keeps the button disabled on empty /
// whitespace-only input so a stray tap can never burn a guess (the reducer
// no-ops those too, but the UI shouldn't invite them).
//
// Kept local to logopaignio/ — no second game needs a free brand field yet, so it
// does not graduate to shared/ (CLAUDE.md).

import { useState } from "react";

import { btnApprove } from "@/styles/recipes";

interface GuessTextInputProps {
  disabled?: boolean;
  onSubmit: (value: string) => void;
}

export function GuessTextInput({ disabled, onSubmit }: GuessTextInputProps) {
  const [value, setValue] = useState("");

  const canSubmit = !disabled && value.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(value);
    setValue("");
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <input
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        disabled={disabled}
        value={value}
        placeholder="Γράψε την εταιρεία…"
        aria-label="Το όνομα της εταιρείας"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        className="w-full px-4 py-3 rounded-control border border-border bg-surface text-foreground text-center text-lg placeholder:text-muted focus:placeholder:text-transparent focus:outline-none focus:ring-2 focus:ring-game-accent disabled:opacity-50"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className={`w-full px-6 py-2.5 rounded-control text-sm font-semibold ${btnApprove}`}
      >
        Μάντεψε
      </button>
    </div>
  );
}
