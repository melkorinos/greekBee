/**
 * The platform mark in the DOM — the same three fanned letter tiles the favicon,
 * apple-icon and share card draw, redrawn in HTML for the Shell header.
 *
 * Why a second drawing at all. `src/app/_brand/fan.tsx` is rendered by satori
 * inside `next/og`, which produces a PNG on the server; it cannot be mounted in
 * a React tree. So the header gets divs — but NOT its own palette: the four
 * colours come from the `--mark-*` tokens in `globals.css`, and
 * `shareMetadata.test.ts` fails if those drift from fan.tsx's constants. That
 * test is the whole reason the header mark cannot quietly stop matching the tab
 * icon sitting two pixels above it.
 *
 * Geometry is `ICON_FAN` scaled to a 28 px centre tile (k ≈ 0.44), rounded to
 * whole pixels — the same "scale one master, never redraw" rule fan.tsx follows.
 * The centre tile is emitted LAST here too, so it paints over both flanks
 * without needing a z-index.
 *
 * No dark ground behind it, unlike the favicon: the tab icon needs a tile to sit
 * in, the header already has one — the header itself.
 */

// Order is load-bearing: the yellow centre tile is last so it paints on top.
const TILES = [
  {
    letter: "Ω",
    className:
      "left-0 top-[2px] w-[25px] h-[25px] rounded-[5px] bg-mark-omega text-white text-[15px] -rotate-[9deg]",
  },
  {
    letter: "π",
    className:
      "left-[43px] top-[2px] w-[25px] h-[25px] rounded-[5px] bg-mark-pi text-white text-[15px] rotate-[11deg]",
  },
  {
    letter: "Λ",
    className:
      "left-[20px] top-0 w-[28px] h-[28px] rounded-[6px] bg-mark-lambda text-mark-ink text-[17px] rotate-3",
  },
];

/** The fan, sized to sit on one line of header chrome. Decorative — the header
 *  link's accessible name comes from the wordmark beside it. */
export function BrandMark() {
  return (
    <span className="relative block w-[68px] h-[28px] shrink-0" aria-hidden="true">
      {TILES.map((tile) => (
        <span
          key={tile.letter}
          className={`absolute flex items-center justify-center font-bold leading-none ${tile.className}`}
        >
          {tile.letter}
        </span>
      ))}
    </span>
  );
}
