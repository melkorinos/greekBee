// LifetimeStatsStrip — the lifetime-stats strip on /profile.
//
// Cross-game points and puzzle count, plus the append-only pangram count. Pure
// display: the page reads GET /api/profile/stats once (useProfileStats) and shares
// it with the Trophy Case, so this strip no longer owns a fetch of its own. Shows a
// skeleton while loading and degrades to dashes on error — it must never block the
// page, which is why `errored` arrives separately from a null `stats`.

import type { ProfileStats } from "@/hooks/useProfileStats";

type Cell = { label: string; value: string };

function StatCell({ label, value }: Cell) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-semibold text-foreground tabular-nums">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export function LifetimeStatsStrip({
  stats,
  errored = false,
}: {
  stats:    ProfileStats | null;
  /** True once the shared read has failed — dashes instead of a forever skeleton. */
  errored?: boolean;
}) {
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
