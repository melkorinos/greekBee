"use client";

// ProfileChip — home-page entry point to /profile.
//
// A small client island (the home page is a server component). It reads the
// persisted identity: shows the display name when this device has an active
// profile (AuthLinked implies ProfileLinked), otherwise a "Σύνδεση" nudge.
// useSyncExternalStore gives a stable "Σύνδεση" server snapshot so there is no
// hydration mismatch, then reads the real value on the client after hydration.

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getDisplayName, isProfileLinked } from "@/hooks/useGameStore";

const NUDGE = "Σύνδεση";
const noopSubscribe = () => () => {};

export function ProfileChip() {
  const label = useSyncExternalStore(
    noopSubscribe,
    () => (isProfileLinked() && getDisplayName()) || NUDGE,
    () => NUDGE,
  );

  return (
    <Link
      href="/profile"
      aria-label="Το προφίλ μου"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-raised transition-colors"
    >
      <span aria-hidden="true">👤</span>
      <span className="max-w-[8rem] truncate">{label}</span>
    </Link>
  );
}
