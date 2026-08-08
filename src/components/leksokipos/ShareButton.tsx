"use client";

// ShareButton — copies the current page URL to the clipboard so players can
// share a custom puzzle with friends.
// Used only in the /leksokipos/[center]/[outer] route for now.

import { useCallback, useState } from "react";
import { btnHeaderIconSize, tooltipBubble } from "@/styles/recipes";

type CopyState = "idle" | "copied" | "error";

interface ShareButtonProps {
  /**
   * Canonical path (e.g. `/leksokipos/α/βγδεζη`) built from the normalised
   * letters server-side.  The full URL is assembled client-side by prepending
   * `window.location.origin` so the share link is always accent-free and absolute.
   * If omitted, falls back to `window.location.href` (e.g. for non-custom pages).
   */
  canonicalPath?: string;
}

export function ShareButton({ canonicalPath }: ShareButtonProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const handleClick = useCallback(async () => {
    // Build an absolute URL from the canonical accent-free path.
    // Falling back to window.location.href is safe for non-custom pages.
    const target = canonicalPath
      ? `${window.location.origin}${canonicalPath}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(target);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [canonicalPath]);

  const tooltip: Record<CopyState, string> = {
    idle:   "Κοινοποίηση",
    copied: "Αντιγράφηκε!",
    error:  "Σφάλμα",
  };

  const style: Record<CopyState, string> = {
    idle:   "border-border text-muted hover:bg-surface-raised active:bg-border",
    copied: "border-green-400 text-green-600 bg-green-50",
    error:  "border-red-400   text-red-600   bg-red-50",
  };

  const icon =
    copyState === "copied" ? (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
        <polyline points="3 8 7 12 13 4" />
      </svg>
    ) : copyState === "error" ? (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4" aria-hidden>
        <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
      </svg>
    ) : (
      // Copy icon — two overlapping pages
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
        <rect x="2" y="5" width="9" height="10" rx="1" />
        <path d="M5 5 V3 a1 1 0 0 1 1 -1 h7 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 h-2" />
      </svg>
    );

  return (
    <div className="relative group">
      <button
        data-testid="btn-share"
        onClick={handleClick}
        className={`${btnHeaderIconSize} flex items-center justify-center rounded-full border transition-colors ${style[copyState]}`}
        aria-label={tooltip[copyState]}
      >
        {icon}
      </button>
      <div className={tooltipBubble}>
        {tooltip[copyState]}
      </div>
    </div>
  );
}
