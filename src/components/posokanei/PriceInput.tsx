"use client";

// PriceInput — the numeric € guess input for Πόσο κάνει; (the one small new UI
// primitive this game needs — topothesies guesses a name from a list, we guess a
// free number). Reuses the platform's play-surface input look (same tokens as the
// topothesies guess field) with a € affix; commits on the "Μάντεψε" button or
// Enter. Accepts a Greek decimal comma or a dot; a non-positive / empty value
// keeps the button disabled so a stray tap can never burn a guess (the reducer
// no-ops invalid guesses too, but the UI shouldn't invite them).
//
// Kept local to posokanei/ — no second game needs a price field yet, so it does
// not graduate to shared/ (CLAUDE.md).

import { useState } from "react";

import { btnApprove } from "@/styles/recipes";

interface PriceInputProps {
  disabled?: boolean;
  onSubmit: (value: number) => void;
}

/** Parse "1,29" or "1.29" (or "1.29 €") to a number, or NaN if it isn't one. */
function parsePrice(raw: string): number {
  const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "").trim();
  if (cleaned === "") return NaN;
  return Number.parseFloat(cleaned);
}

export function PriceInput({ disabled, onSubmit }: PriceInputProps) {
  const [value, setValue] = useState("");

  const parsed   = parsePrice(value);
  const canSubmit = !disabled && Number.isFinite(parsed) && parsed > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(parsed);
    setValue("");
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="relative w-full">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={value}
          placeholder="0,00"
          aria-label="Η τιμή σου σε ευρώ"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
          className="w-full pl-4 pr-10 py-3 rounded-control border border-border bg-surface text-foreground text-center text-lg placeholder:text-muted focus:placeholder:text-transparent focus:outline-none focus:ring-2 focus:ring-game-accent disabled:opacity-50"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-muted"
        >
          €
        </span>
      </div>
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
