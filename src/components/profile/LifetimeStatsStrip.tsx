"use client";

// LifetimeStatsStrip — the lifetime-stats strip on /profile.
//
// Fetches GET /api/profile/stats for this device on mount. Cross-game points and
// puzzle count, plus the append-only pangram count. Shows a skeleton while
// loading and degrades to dashes on error — it must never block the page.

import { useEffect, useState } from "react";

interface Stats {
  total_points:   number;
  puzzles_played: number;
  pangram_count:  number;
}

type Cell = { label: string; value: string };

function StatCell({ label, value }: Cell) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-semibold text-foreground tabular-nums">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export function LifetimeStatsStrip({ deviceId }: { deviceId: string }) {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    fetch(`/api/profile/stats?device_uuid=${encodeURIComponent(deviceId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("stats fetch failed"))))
      .then((d: Stats) => { if (!cancelled) setStats(d); })
      .catch(() => { if (!cancelled) setErrored(true); });
    return () => { cancelled = true; };
  }, [deviceId]);

  const fmt = (n: number) => n.toLocaleString("el-GR");
  const cells: Cell[] = [
    { label: "Πόντοι",   value: stats ? fmt(stats.total_points)   : "—" },
    { label: "Παζλ",     value: stats ? fmt(stats.puzzles_played) : "—" },
    { label: "Πανγκράμ", value: stats ? fmt(stats.pangram_count)  : "—" },
  ];

  // Loading: neutral skeleton (no stats yet, no error).
  if (!stats && !errored) {
    return (
      <div data-testid="stats-skeleton" className="flex justify-around px-5 py-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="h-6 w-10 rounded bg-surface-raised animate-pulse" />
            <div className="h-3 w-12 rounded bg-surface-raised animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex justify-around px-5 py-4">
      {cells.map((c) => (
        <StatCell key={c.label} {...c} />
      ))}
    </div>
  );
}
