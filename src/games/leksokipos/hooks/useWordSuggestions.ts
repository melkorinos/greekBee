"use client";

// useWordSuggestions — the "suggest this word for the dictionary" flow behind a
// rejected submission (FeedbackMessage → NominationModal).
//
// Three pieces of state that only make sense together:
//   - which word's nomination modal is open (if any)
//   - which words this device has already suggested — seeded from the persisted
//     list, then kept in sync in memory so the button flips without a re-read
//   - which word was *just* suggested, i.e. show the one-shot confirmation
//
// Words are compared case-insensitively throughout: the player's submission is
// whatever they typed, the persisted list is normalized. Callers pass raw words.

import { useCallback, useState } from "react";

import { getSuggestedWords, markSuggested } from "@/hooks/suggestions";

export interface WordSuggestions {
  /** The word whose nomination modal is open, or null when it is closed. */
  pendingWord: string | null;
  /** Has this device already suggested this word (this session or a previous one)? */
  isSuggested: (word: string) => boolean;
  /** Was this word suggested just now — i.e. show the confirmation? */
  isJustSuggested: (word: string) => boolean;
  /** Open the nomination modal for a word. */
  open: (word: string) => void;
  /** Close the modal without suggesting. */
  close: () => void;
  /** Record a successful nomination and show its confirmation. */
  confirm: (word: string) => void;
  /** Drop the confirmation — the player has moved on to a new word. */
  clearConfirmation: () => void;
}

export function useWordSuggestions(): WordSuggestions {
  const [pendingWord, setPendingWord] = useState<string | null>(null);
  const [justSuggested, setJustSuggested] = useState<string | null>(null);
  // getSuggestedWords is SSR-safe (returns [] with no window), so the server and
  // the hydration render both start empty and fill in on the client.
  const [suggested, setSuggested] = useState<Set<string>>(() => new Set(getSuggestedWords()));

  const open = useCallback((word: string) => {
    setPendingWord(word);
    setJustSuggested(null);
  }, []);

  const close = useCallback(() => setPendingWord(null), []);

  const confirm = useCallback((word: string) => {
    markSuggested(word);
    const norm = word.toLowerCase();
    setSuggested((prev) => new Set([...prev, norm]));
    setJustSuggested(norm);
    setPendingWord(null);
  }, []);

  const clearConfirmation = useCallback(() => setJustSuggested(null), []);

  const isSuggested = useCallback((word: string) => suggested.has(word.toLowerCase()), [suggested]);

  const isJustSuggested = useCallback(
    (word: string) => justSuggested === word.toLowerCase(),
    [justSuggested],
  );

  return { pendingWord, isSuggested, isJustSuggested, open, close, confirm, clearConfirmation };
}
