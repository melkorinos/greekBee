"use client";

// IdentityHeader — display-only header on /profile.
//
// Reflects the device's identity state as an initial-letter avatar disc + a
// status line. Display only: the interactive sign-in/out flows live in the
// ProfileSection rendered below it on the page.

export interface IdentityHeaderProps {
  authLinked:   boolean;
  profileLinked: boolean;
  displayName:  string;
  authUserName: string | null;
}

export function IdentityHeader({
  authLinked,
  profileLinked,
  displayName,
  authUserName,
}: IdentityHeaderProps) {
  const name    = (authUserName ?? displayName).trim();
  const initial = name.charAt(0).toUpperCase() || "Α";

  let statusLine: string;
  let subText: string | null;
  if (authLinked) {
    statusLine = `Συνδεδεμένος με Google ως ${authUserName ?? displayName}`;
    subText    = null;
  } else if (profileLinked) {
    statusLine = `Προφίλ ενεργό: ${displayName || "Ανώνυμος"}`;
    subText    = "Σύνδεσέ το με Google για να μην το χάσεις ποτέ.";
  } else {
    statusLine = "Παίζεις ανώνυμα";
    subText    = "Σύνδεσε λογαριασμό για να κρατήσεις τα σκορ σου.";
  }

  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div
        data-testid="avatar-disc"
        className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-raised text-foreground text-lg font-semibold select-none"
      >
        {initial}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{statusLine}</p>
        {subText && <p className="text-xs text-muted mt-0.5">{subText}</p>}
      </div>
    </div>
  );
}
