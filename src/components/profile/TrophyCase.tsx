"use client";

// TrophyCase — the Trophy Case grid on /profile.
//
// v1 is display-only: every catalog entry renders locked/greyed (no earned state
// yet — detection lands with the achievements epic). Tiered badges show their tier
// thresholds. Page-local by design; nothing graduates to shared/ speculatively.

import { LEKSOKIPOS_ACHIEVEMENTS, type Achievement } from "@/games/leksokipos/lib/achievements";

function TrophyTile({ achievement }: { achievement: Achievement }) {
  return (
    <div
      data-testid="trophy-tile"
      className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface-raised px-3 py-4 text-center opacity-60"
    >
      <span className="text-2xl grayscale" aria-hidden="true">🔒</span>
      <span className="text-xs font-semibold text-foreground">{achievement.name}</span>
      <span className="text-[11px] leading-tight text-muted">{achievement.hint}</span>
      {achievement.tiers && (
        <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
          {achievement.tiers.map((t) => (
            <span key={t.id} className="text-[10px] text-muted whitespace-nowrap">
              {t.label} · {t.threshold.toLocaleString("el-GR")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function TrophyCase() {
  return (
    <div className="px-5 py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        Προθήκη Τροπαίων
      </p>
      <p
        data-testid="trophy-beta-notice"
        className="mb-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-[11px] leading-snug text-muted"
      >
        🚧 Δοκιμαστική λειτουργία (beta): τα τρόπαια δεν κερδίζονται ακόμα και θα μηδενιστούν με την επίσημη κυκλοφορία.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {LEKSOKIPOS_ACHIEVEMENTS.map((a) => (
          <TrophyTile key={a.id} achievement={a} />
        ))}
      </div>
    </div>
  );
}
