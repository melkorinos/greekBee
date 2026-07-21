"use client";

// GuessAutocomplete — accent-insensitive, list-constrained guess input.
//
// The input is constrained to the candidate list: submit only fires for text
// that resolves to a candidate, so a typo can never waste a guess (the reducer
// no-ops invalid guesses too, but the UI shouldn't invite them). Matching is
// accent-insensitive via normalizeLetters (the platform no-accent invariant).

import { useMemo, useRef, useState } from "react";

import { normalizeLetters } from "@/lib/normalize";

export interface GuessCandidate {
  /** The value dispatched on submit (Greek display form). */
  label: string;
  /** Accent-free form used for matching. */
  normalized: string;
}

interface GuessAutocompleteProps {
  candidates: GuessCandidate[];
  placeholder: string;
  disabled?: boolean;
  onSubmit: (label: string) => void;
}

const MAX_SUGGESTIONS = 6;

export function GuessAutocomplete({ candidates, placeholder, disabled, onSubmit }: GuessAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = normalizeLetters(query.trim());
    if (!q) return [];
    const starts: GuessCandidate[] = [];
    const contains: GuessCandidate[] = [];
    for (const c of candidates) {
      if (c.normalized.startsWith(q)) starts.push(c);
      else if (c.normalized.includes(q)) contains.push(c);
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [query, candidates]);

  const submit = (candidate: GuessCandidate | undefined) => {
    if (!candidate) return; // no resolvable match — never burns a guess
    onSubmit(candidate.label);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="off"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => { setQuery(e.target.value); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); submit(matches[active]); }
          else if (e.key === "Escape") { setQuery(""); }
        }}
        className="w-full px-4 py-3 rounded-control border border-border bg-surface text-foreground text-center text-lg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-game-accent disabled:opacity-50"
      />
      {matches.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 rounded-control border border-border bg-surface-raised shadow-card overflow-hidden">
          {matches.map((c, i) => (
            <li key={c.label}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); submit(c); }}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-4 py-2.5 text-foreground ${
                  i === active ? "bg-game-accent text-game-accent-foreground" : "hover:bg-surface"
                }`}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
