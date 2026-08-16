"use client";

// WordsByLengthCard — the "Λέξεις ανά μήκος" distribution card on /profile.
//
// Fetches GET /api/profile/words for this device on mount and renders the found-word
// count per length as a small horizontal-bar distribution (a magnitude-by-category
// form — one series, so one hue and no legend; bars carry the magnitude, the ink
// carries the labels). Only long words are tracked, so every bucket row (10, 11, 12
// individually + a "13+" tail — each length is itself a badge) is always present so
// the layout never reflows; a length with no finds shows an empty track.
//
// States: a skeleton while loading, an honest empty state when the device has found
// nothing (there is NO backfill — historical finds were never stored — so the copy
// must not imply lost history), and a dash total on error. It must never block the
// page. Leksokipos-only today (the only game with free-form found words).

import { useEffect, useState } from "react";

import { WORDS_MIN_TRACKED, type WordsByLength } from "@/lib/wordsByLength";

const HEADING = "Λέξεις ανά μήκος";

// The floor is the card's most confusing fact: a player who has found hundreds of
// words sees a total of 0 and reads it as broken, because nothing on the card said
// short words were never counted. Both strings name the floor, and both DERIVE it —
// the tracked minimum is achievementTuning.wordLengthBadges' smallest length.
const FLOOR_NOTE  = `Μετρώνται μόνο λέξεις με ${WORDS_MIN_TRACKED}+ γράμματα.`;
const EMPTY_COPY  = `Δεν έχεις βρει ακόμη λέξη με ${WORDS_MIN_TRACKED}+ γράμματα. Βρες μία για να ξεκινήσεις τη συλλογή σου.`;

function Row({ label, count, max }: { label: string; count: number; max: number }) {
  // Bar length is proportional to the busiest bucket; a found-but-small bucket still
  // shows a sliver so "found something" never reads as "found nothing".
  const pct = max > 0 && count > 0 ? Math.max(4, (count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 shrink-0 text-right text-xs font-semibold text-muted tabular-nums">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-raised">
        <div className="h-full rounded-full bg-inverted" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-sm font-semibold text-foreground tabular-nums">{count}</span>
    </div>
  );
}

export function WordsByLengthCard({ deviceId }: { deviceId: string }) {
  const [data,    setData]    = useState<WordsByLength | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    fetch(`/api/profile/words?device_uuid=${encodeURIComponent(deviceId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("words fetch failed"))))
      .then((d: WordsByLength) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setErrored(true); });
    return () => { cancelled = true; };
  }, [deviceId]);

  // Loading: neutral skeleton (no data yet, no error).
  if (!data && !errored) {
    return (
      <div data-testid="words-by-length-skeleton" className="px-5 py-4 space-y-2.5">
        <div className="h-4 w-32 rounded bg-surface-raised animate-pulse" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-2.5 w-full rounded-full bg-surface-raised animate-pulse" />
        ))}
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString("el-GR");

  return (
    <div className="px-5 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">{HEADING}</h2>
        <span className="text-lg font-semibold text-foreground tabular-nums">
          {data ? fmt(data.total) : "—"}
        </span>
      </div>
      <p data-testid="words-by-length-floor" className="mb-3 text-[11px] leading-tight text-muted">
        {FLOOR_NOTE}
      </p>

      {data && data.total === 0 ? (
        <p data-testid="words-by-length-empty" className="py-2 text-sm text-muted">
          {EMPTY_COPY}
        </p>
      ) : data ? (
        <div className="space-y-2">
          {data.buckets.map((b) => (
            <Row
              key={b.key}
              label={b.key}
              count={b.count}
              max={Math.max(...data.buckets.map((x) => x.count))}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
