// @vitest-environment node
//
// shareMetadata.test.ts
// The share preview — TICKET-10. A posted link is the whole soft launch, and
// nothing else in the suite looks at it.
//
// The `node` environment above is load-bearing, not tidiness. `ImageResponse`
// hands satori's SVG to sharp, and under the suite's default jsdom environment
// sharp receives it as a plain array-like and throws `Unsupported input` —
// which looks exactly like a broken card and is not one.
//
// Two kinds of assertion here, and the split is deliberate:
//
//   1. **Rendered.** `opengraph-image` / `icon` / `apple-icon` are actually run
//      through satori and the resulting PNG is inspected. A source-text match
//      would pass while the card rendered blank.
//   2. **Read out of the font.** The mark now ships its own 12 KB subset of
//      Inter Bold, and a character missing from a subset renders as *nothing* —
//      no error, no fallback box. So the cmap is parsed and every character the
//      mark draws is checked against it.
//   3. **Source text.** The `layout.tsx` metadata block, where the contract is
//      "reuses the config values" and "does not name the image files" — neither
//      of which is visible in output.

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { PLATFORM_NAME, PLATFORM_DESCRIPTION } from "@/config/platform";
import { missingGlyphs } from "@/app/_brand/cmap";

const ROOT = resolve(__dirname, "../../../");
const layoutSource = readFileSync(resolve(ROOT, "src/app/layout.tsx"), "utf8");

/** Source with comments removed. The metadata block is documented by a comment
 *  that names the very files the drift check forbids naming, so a check over
 *  raw source fails on the prose explaining why it must not fail. */
const layoutCode = layoutSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

/** Width and height out of a PNG's IHDR chunk, which is always the first one:
 *  8-byte signature, 4-byte length, 4-byte type, then the two dimensions. */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

async function render(mod: { default: () => Response | Promise<Response> }) {
  const res = await mod.default();
  return new Uint8Array(await res.arrayBuffer());
}

describe("Share preview — the generated images", () => {
  // satori is slow to start; these are seconds, not milliseconds.
  it("opengraph-image renders a 1200×630 PNG", { timeout: 30_000 }, async () => {
    const mod = await import("@/app/opengraph-image");
    expect(mod.size).toEqual({ width: 1200, height: 630 });
    expect(mod.contentType).toBe("image/png");

    const bytes = await render(mod);
    expect([...bytes.slice(0, 4)]).toEqual(PNG_MAGIC);
    expect(pngSize(bytes)).toEqual({ width: 1200, height: 630 });
    // A blank card still encodes to a valid PNG, but a flat one compresses to
    // almost nothing. The real card carries three tiles and a wordmark.
    expect(bytes.byteLength).toBeGreaterThan(4_000);
  });

  it("icon renders a 32×32 PNG", { timeout: 30_000 }, async () => {
    const mod = await import("@/app/icon");
    expect(mod.size).toEqual({ width: 32, height: 32 });
    const bytes = await render(mod);
    expect([...bytes.slice(0, 4)]).toEqual(PNG_MAGIC);
    expect(pngSize(bytes)).toEqual({ width: 32, height: 32 });
  });

  it("apple-icon renders a 180×180 PNG", { timeout: 30_000 }, async () => {
    const mod = await import("@/app/apple-icon");
    expect(mod.size).toEqual({ width: 180, height: 180 });
    const bytes = await render(mod);
    expect([...bytes.slice(0, 4)]).toEqual(PNG_MAGIC);
    expect(pngSize(bytes)).toEqual({ width: 180, height: 180 });
  });

  it("the card's alt text names the platform", async () => {
    const mod = await import("@/app/opengraph-image");
    expect(mod.alt).toContain(PLATFORM_NAME);
  });
});

describe("Share preview — the mark cannot drift between sizes", () => {
  it("all three images draw the one Fan module", () => {
    for (const file of ["opengraph-image.tsx", "icon.tsx", "apple-icon.tsx"]) {
      const src = readFileSync(resolve(ROOT, "src/app", file), "utf8");
      expect(
        src.includes("./_brand/fan"),
        `${file} must draw the shared mark from src/app/_brand/fan.tsx. A second ` +
          `drawing is how the favicon and the share card stop matching.`,
      ).toBe(true);
    }
  });

  it("the bundled font has a glyph for everything the mark draws", () => {
    // The real guard, and the reason it is not a text match: a character absent
    // from a subset font renders as NOTHING — no error, no fallback box, no
    // warning. A blank tile or a gap-toothed wordmark would pass every other
    // assertion in this file.
    const font = readFileSync(resolve(ROOT, "src/app/_brand/Inter-Bold-subset.ttf"));
    const src = readFileSync(resolve(ROOT, "src/app/_brand/fan.tsx"), "utf8");

    // Every letter the tiles draw, taken from the `letter:` fields themselves,
    // plus the wordmark the card sets beneath them.
    const tileLetters = [...src.matchAll(/letter:\s*"([^"]*)"/g)].map((m) => m[1]);
    expect(tileLetters.length).toBeGreaterThan(0);
    const drawn = tileLetters.join("") + PLATFORM_NAME;

    expect(
      missingGlyphs(new Uint8Array(font), drawn),
      `Inter-Bold-subset.ttf has no glyph for these characters, so they would ` +
        `render as empty space in the share card or the icon. Either re-cut the ` +
        `subset to include them (Google Fonts \`text=\` parameter, see brandFont() ` +
        `in fan.tsx) or keep the mark inside what the font already carries.`,
    ).toEqual([]);
  });

  it("the subset stays a subset — it is not a full font that crept in", () => {
    // The point of the file is that it is ~12 KB rather than the ~350 KB a full
    // Greek face costs. A regeneration that drops the `text=` parameter would
    // still pass every other test here.
    const font = readFileSync(resolve(ROOT, "src/app/_brand/Inter-Bold-subset.ttf"));
    expect(font.byteLength).toBeLessThan(60_000);

    // And it really is cut down: accented Greek is what a full face would carry.
    expect(missingGlyphs(new Uint8Array(font), "άέίόύ")).toHaveLength(5);
  });
});

describe("Share preview — the layout metadata block", () => {
  it("declares openGraph and twitter", () => {
    expect(layoutSource).toMatch(/openGraph:\s*\{/);
    expect(layoutSource).toMatch(/twitter:\s*\{/);
    expect(layoutSource).toContain('card:        "summary_large_image"');
  });

  it("reuses the config values rather than repeating the strings", () => {
    // The description is derived from the registry and filters `hidden` Games
    // (registryCoverage seam 1d). A literal here would go stale the next time a
    // Game is hidden, and advertise it to every scraper.
    expect(layoutSource).toContain("PLATFORM_DESCRIPTION");
    expect(layoutSource).toContain("PLATFORM_NAME");
    expect(layoutSource).not.toContain(PLATFORM_DESCRIPTION);
    expect(layoutSource).toMatch(/metadataBase:\s*new URL\(PLATFORM_ORIGIN\)/);
  });

  it("does not also name the generated image files", () => {
    // Next's file conventions inject og:image / icon / apple-icon from the files
    // in src/app. Naming them in the metadata object as well emits both, and the
    // two copies drift the first time a size changes.
    for (const key of ["opengraph-image", "apple-icon", "/icon", "favicon"]) {
      expect(
        layoutCode.includes(key),
        `layout.tsx names "${key}" in its metadata. Delete it — the file ` +
          `convention already emits that tag, and two sources of the same tag drift.`,
      ).toBe(false);
    }
  });
});

describe("Share preview — the stock favicon is gone", () => {
  it("src/app/favicon.ico does not exist", () => {
    // The Create-Next-App file was served in production until 2026-08-16, so
    // every tab showed the Next.js logo. /favicon.ico is requested directly by
    // browsers and several scrapers, so adding icon.tsx alongside it was not
    // enough — the file had to go.
    expect(
      existsSync(resolve(ROOT, "src/app/favicon.ico")),
      "src/app/favicon.ico is back. If a real .ico is ever wanted it must be " +
        "the chosen mark, never the Create-Next-App default.",
    ).toBe(false);
  });
});
