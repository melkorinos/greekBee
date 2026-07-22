"use client";

// GuessAutocomplete — accent-insensitive, list-constrained guess input.
//
// The input is constrained to the candidate list: submit only fires for text
// that resolves to a candidate, so a typo can never waste a guess (the reducer
// no-ops invalid guesses too, but the UI shouldn't invite them). Matching is
// accent-insensitive via normalizeLetters (the platform no-accent invariant).
//
// Focusing the empty input opens the FULL candidate list (a scrollable drop-down
// of every available answer / capital); typing narrows it. Keyboard nav keeps the
// active row scrolled into view since the list can be long.

import { useEffect, useMemo, useRef, useState } from "react";

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

export function GuessAutocomplete({ candidates, placeholder, disabled, onSubmit }: GuessAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  // The list (full or filtered) always reads alphabetically (Greek collation).
  const sorted = useMemo(
    () => [...candidates].sort((a, b) => a.label.localeCompare(b.label, "el")),
    [candidates],
  );

  const matches = useMemo(() => {
    const q = normalizeLetters(query.trim());
    if (!q) return sorted; // empty input → the full available list
    const starts: GuessCandidate[] = [];
    const contains: GuessCandidate[] = [];
    for (const c of sorted) {
      if (c.normalized.startsWith(q)) starts.push(c);
      else if (c.normalized.includes(q)) contains.push(c);
    }
    return [...starts, ...contains];
  }, [query, sorted]);

  // Keep the highlighted row visible as the player arrows through a long list.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const submit = (candidate: GuessCandidate | undefined) => {
    if (!candidate) return; // no resolvable match — never burns a guess
    onSubmit(candidate.label);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };

  const showList = open && matches.length > 0;

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
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); submit(matches[active]); }
          else if (e.key === "Escape") { setOpen(false); setQuery(""); }
        }}
        className="w-full px-4 py-3 rounded-control border border-border bg-surface text-foreground text-center text-lg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-game-accent disabled:opacity-50"
      />
      {showList && (
        <ul className="absolute z-10 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-control border border-border bg-surface-raised shadow-card">
          {matches.map((c, i) => (
            <li key={c.normalized} ref={i === active ? activeRef : undefined}>
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
