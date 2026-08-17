/**
 * Just enough TrueType parsing to answer one question: does this font have a
 * glyph for this character?
 *
 * It exists because of how a subset font fails. `Inter-Bold-subset.ttf` carries
 * 62 characters, and a character outside that set does not error, does not draw
 * a fallback box, and does not warn — it renders as **nothing**, leaving a gap
 * in the wordmark or an empty tile. `shareMetadata.test.ts` uses this to assert
 * every character the mark actually draws has a glyph, so widening the wordmark
 * past the subset fails the suite instead of the card.
 *
 * Only `cmap` format 4 and format 12 are handled, which is what Google's subset
 * endpoint emits. An unrecognised subtable throws rather than returning "not
 * covered" — a parser that quietly answers no would fail every character and
 * read as a broken font.
 */

/** Byte offset of a table in an sfnt file, or null when absent. */
function findTable(view: DataView, tag: string): number | null {
  const numTables = view.getUint16(4);
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16;
    const found = String.fromCharCode(
      view.getUint8(record),
      view.getUint8(record + 1),
      view.getUint8(record + 2),
      view.getUint8(record + 3),
    );
    if (found === tag) return view.getUint32(record + 8);
  }
  return null;
}

/** The best Unicode subtable in `cmap`, preferring full-range (3,10) over BMP. */
function findUnicodeSubtable(view: DataView, cmap: number): number | null {
  const numSubtables = view.getUint16(cmap + 2);
  let best: number | null = null;
  let bestScore = -1;

  for (let i = 0; i < numSubtables; i++) {
    const record = cmap + 4 + i * 8;
    const platformId = view.getUint16(record);
    const encodingId = view.getUint16(record + 2);
    const offset = cmap + view.getUint32(record + 4);

    // (3,10) full Unicode > (3,1) Windows BMP > (0,*) Unicode platform.
    const score =
      platformId === 3 && encodingId === 10 ? 3 : platformId === 3 && encodingId === 1 ? 2 : platformId === 0 ? 1 : -1;
    if (score > bestScore) {
      bestScore = score;
      best = offset;
    }
  }
  return best;
}

function lookupFormat4(view: DataView, table: number, code: number): number {
  if (code > 0xffff) return 0;
  const segCount = view.getUint16(table + 6) / 2;
  const endCodes = table + 14;
  const startCodes = endCodes + segCount * 2 + 2;
  const idDeltas = startCodes + segCount * 2;
  const idRangeOffsets = idDeltas + segCount * 2;

  for (let seg = 0; seg < segCount; seg++) {
    if (view.getUint16(endCodes + seg * 2) < code) continue;
    if (view.getUint16(startCodes + seg * 2) > code) return 0;

    const rangeOffset = view.getUint16(idRangeOffsets + seg * 2);
    if (rangeOffset === 0) {
      return (code + view.getInt16(idDeltas + seg * 2)) & 0xffff;
    }
    // The spec's pointer arithmetic: the offset is measured from its own slot.
    const glyphAddr =
      idRangeOffsets + seg * 2 + rangeOffset + (code - view.getUint16(startCodes + seg * 2)) * 2;
    const glyph = view.getUint16(glyphAddr);
    return glyph === 0 ? 0 : (glyph + view.getInt16(idDeltas + seg * 2)) & 0xffff;
  }
  return 0;
}

function lookupFormat12(view: DataView, table: number, code: number): number {
  const numGroups = view.getUint32(table + 12);
  for (let i = 0; i < numGroups; i++) {
    const group = table + 16 + i * 12;
    const start = view.getUint32(group);
    const end = view.getUint32(group + 4);
    if (code < start) return 0;
    if (code <= end) return view.getUint32(group + 8) + (code - start);
  }
  return 0;
}

/** Every character in `text` that the font has no glyph for. Empty means the
 *  font can draw all of it. Duplicates and characters with no outline of their
 *  own — space is the only one in play — are handled by the font itself. */
export function missingGlyphs(font: Uint8Array, text: string): string[] {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);

  const cmap = findTable(view, "cmap");
  if (cmap === null) throw new Error("Font has no cmap table.");

  const subtable = findUnicodeSubtable(view, cmap);
  if (subtable === null) throw new Error("Font has no Unicode cmap subtable.");

  const format = view.getUint16(subtable);
  if (format !== 4 && format !== 12) {
    throw new Error(`Unsupported cmap format ${format} — extend this parser rather than trusting a "no".`);
  }

  const missing: string[] = [];
  for (const char of new Set(text)) {
    const code = char.codePointAt(0)!;
    const glyph = format === 4 ? lookupFormat4(view, subtable, code) : lookupFormat12(view, subtable, code);
    if (glyph === 0) missing.push(char);
  }
  return missing;
}
