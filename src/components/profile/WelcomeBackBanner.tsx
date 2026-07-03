"use client";

// WelcomeBackBanner — one-shot Sign-in Restore greeting on /profile.
//
// The auth callback sets sessionStorage["signin-restore-welcome"] to the adopted
// display name (or "" when nameless) when a returning player is restored (ADR 0012).
// This banner consumes that flag on mount: renders once, then clears it so a
// refresh won't repeat the greeting. Absent flag → renders nothing.

import { useEffect, useState } from "react";

export function WelcomeBackBanner() {
  const [welcome] = useState<string | null>(() =>
    typeof window === "undefined" ? null : sessionStorage.getItem("signin-restore-welcome"),
  );

  useEffect(() => {
    if (welcome !== null) sessionStorage.removeItem("signin-restore-welcome");
  }, [welcome]);

  if (welcome === null) return null;

  const name = welcome.trim();
  const greeting = name
    ? `Καλώς όρισες πίσω, ${name}! Τα σκορ σου επαναφέρθηκαν.`
    : "Καλώς όρισες πίσω! Τα σκορ σου επαναφέρθηκαν.";

  return (
    <div className="mx-5 my-3 rounded-lg border border-correct/40 bg-surface-raised px-4 py-3 text-sm text-foreground">
      {greeting}
    </div>
  );
}
