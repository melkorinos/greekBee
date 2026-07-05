"use client";

// TrophyCase — the Trophy Case grid on /profile.
//
// Fetches the device's earned achievement ids (GET /api/achievements) and lights
// the matching one-shot tiles; everything else renders locked/greyed. Tiered
// badges stay locked in v1 — their per-tier lighting is Epic B (only tier ids are
// ever earned, and the catalog's top-level id never is). Page-local by design.

import { useEffect, useState } from "react";

import { LEKSOKIPOS_ACHIEVEMENTS, type Achievement } from "@/games/leksokipos/lib/achievements";

function TrophyTile({ achievement, earned }: { achievement: Achievement; earned: boolean }) {
  return (
    <div
      data-testid="trophy-tile"
      data-earned={earned}
      className={
        "flex flex-col items-center gap-1 rounded-xl border px-3 py-4 text-center " +
        (earned
          ? "border-border bg-surface-raised"
          : "border-border bg-surface-raised opacity-60")
      }
    >
      <span className={earned ? "text-2xl" : "text-2xl grayscale"} aria-hidden="true">
        {earned ? "🏆" : "🔒"}
      </span>
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

export function TrophyCase({ deviceId = "" }: { deviceId?: string }) {
  const [earned, setEarned] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    fetch(`/api/achievements?device_uuid=${encodeURIComponent(deviceId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("achievements fetch failed"))))
      .then((d: { earned?: string[] }) => {
        if (!cancelled) setEarned(new Set(d.earned ?? []));
      })
      .catch(() => { /* leave tiles locked — never block the page */ });
    return () => { cancelled = true; };
  }, [deviceId]);

  return (
    <div className="px-5 py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        Προθήκη Τροπαίων
      </p>
      <p
        data-testid="trophy-beta-notice"
        className="mb-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-[11px] leading-snug text-muted"
      >
        🚧 Δοκιμαστική λειτουργία (beta): τα τρόπαια ενδέχεται να μηδενιστούν με την επίσημη κυκλοφορία.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {LEKSOKIPOS_ACHIEVEMENTS.map((a) => (
          <TrophyTile key={a.id} achievement={a} earned={earned.has(a.id)} />
        ))}
      </div>
    </div>
  );
}
