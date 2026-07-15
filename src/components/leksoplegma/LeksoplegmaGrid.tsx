"use client";

// LeksoplegmaGrid — the 4×4 letter-web play surface.
// SVG edge lines underneath, tile buttons on top. Collapse is SOFT: cleared
// tiles/edges (in the web but no longer live) dim instead of disappearing and
// stay fully traceable, so extra words are never lost mid-round. Bright =
// still hides a required word; dim = cleared.
//
// Two control schemes, one seam: taps call onTapTile; pointer-drags call
// onDragExtend per tile crossed and onDragRelease on lift. The Board owns the
// trace and submits through the reducer's TRACE_WORD either way. Drag tile
// detection uses elementFromPoint so touch works without per-tile capture.

import { useEffect, useRef } from "react";

import { LEKSOPLEGMA } from "@/config/gameRules";

const SIZE = Math.sqrt(LEKSOPLEGMA.GRID_SIZE); // 4
const CELL = 100; // SVG units per cell

function tileCenter(tile: number): { x: number; y: number } {
  return {
    x: (tile % SIZE) * CELL + CELL / 2,
    y: Math.floor(tile / SIZE) * CELL + CELL / 2,
  };
}

interface LeksoplegmaGridProps {
  letters:        string;
  /** Full authored web — every tile/edge stays rendered and traceable. */
  webTiles:       ReadonlySet<number>;
  webEdgeKeys:    ReadonlySet<string>;
  /** Still needed by an unfound required word — rendered bright; the rest dim. */
  liveTiles:      ReadonlySet<number>;
  liveEdgeKeys:   ReadonlySet<string>;
  trace:          readonly number[];
  hintStartTiles: ReadonlySet<number>;
  onTapTile:      (tile: number) => void;
  onDragExtend:   (tile: number) => void;
  onDragRelease:  () => void;
}

export function LeksoplegmaGrid({
  letters,
  webTiles,
  webEdgeKeys,
  liveTiles,
  liveEdgeKeys,
  trace,
  hintStartTiles,
  onTapTile,
  onDragExtend,
  onDragRelease,
}: LeksoplegmaGridProps) {
  const draggingRef  = useRef(false);
  const dragMovedRef = useRef(false);
  const downTileRef  = useRef<number | null>(null);

  // Release anywhere (finger may lift outside the grid).
  const releaseRef = useRef(onDragRelease);
  useEffect(() => { releaseRef.current = onDragRelease; });
  useEffect(() => {
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (dragMovedRef.current) releaseRef.current();
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function tileFromPoint(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest?.("[data-tile]");
    const raw = el?.getAttribute("data-tile");
    return raw === null || raw === undefined ? null : Number(raw);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const tile = tileFromPoint(e.clientX, e.clientY);
    if (tile === null || !webTiles.has(tile)) return;
    if (!dragMovedRef.current && tile === downTileRef.current) return;
    if (!dragMovedRef.current && downTileRef.current !== null) {
      // The gesture became a drag: the press tile joins the trace first.
      dragMovedRef.current = true;
      onDragExtend(downTileRef.current);
    }
    onDragExtend(tile);
  }

  const edgeLines = [...webEdgeKeys].map((key) => {
    const [a, b] = key.split("-").map(Number);
    return { key, live: liveEdgeKeys.has(key), from: tileCenter(a), to: tileCenter(b) };
  });

  const traceLines = trace.slice(1).map((tile, i) => ({
    key: `t${trace[i]}-${tile}`,
    from: tileCenter(trace[i]),
    to: tileCenter(tile),
  }));

  const traced = new Set(trace);

  return (
    <div
      className="relative w-full max-w-sm aspect-square touch-none select-none"
      onPointerMove={handlePointerMove}
    >
      <svg
        viewBox={`0 0 ${SIZE * CELL} ${SIZE * CELL}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden
      >
        {edgeLines.map(({ key, live, from, to }) => (
          <line
            key={key}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            strokeWidth={5}
            strokeLinecap="round"
            className={live ? "stroke-[color:var(--color-border)]" : "stroke-[color:var(--color-border)] opacity-30"}
          />
        ))}
        {traceLines.map(({ key, from, to }) => (
          <line
            key={key}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            strokeWidth={9}
            strokeLinecap="round"
            className="stroke-[color:var(--color-game-accent)] opacity-70"
          />
        ))}
      </svg>

      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
        {[...letters].map((letter, tile) => {
          if (!webTiles.has(tile)) return <div key={tile} />;
          const isTraced = traced.has(tile);
          const isHinted = hintStartTiles.has(tile);
          const isDim    = !liveTiles.has(tile) && !isTraced;
          return (
            <div key={tile} className="flex items-center justify-center">
              <button
                data-tile={tile}
                aria-label={`Γράμμα ${letter}`}
                onClick={() => onTapTile(tile)}
                onPointerDown={(e) => {
                  draggingRef.current = true;
                  dragMovedRef.current = false;
                  downTileRef.current = tile;
                  (e.target as Element).releasePointerCapture?.(e.pointerId);
                }}
                className={`flex items-center justify-center w-[68%] aspect-square rounded-2xl border-2 text-xl font-bold uppercase transition-colors ${
                  isTraced
                    ? "bg-game-accent border-game-accent text-game-accent-foreground"
                    : "bg-surface-raised border-border text-foreground hover:bg-border"
                } ${isDim ? "opacity-40" : ""} ${isHinted && !isTraced ? "ring-2 ring-game-accent ring-offset-2 ring-offset-background" : ""}`}
              >
                {letter}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
