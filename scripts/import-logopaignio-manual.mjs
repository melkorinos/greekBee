// Λογοπαίγνιο — PLAN F: import operator-supplied logo images.
//
// The five automated plans (Commons, official sites, favicons, Wikipedia,
// Wayback) are exhausted for 43 brands: dead domains, anti-bot 403s, parent-only
// logos, and Greek brand names that collide with ordinary words. Those need a
// human, and this is how the human's files get in.
//
// USAGE
//   1. Name each file after the brand's SEED ID (mythos.png) OR its DISPLAY NAME
//      (Μύθος.png) — both resolve. The operator's first batch arrived named by
//      display name, which is the natural thing to type, so matching accepts it:
//      accents, case and spacing are all folded away before comparing, and the
//      brand's accept-list is searched too (so "7Days.png" finds `sevendays`).
//   2. Drop them all in one folder (default: public/logopaignio/_manual/).
//   3. node scripts/import-logopaignio-manual.mjs [folder]
//
// A trailing number marks a DELIBERATE alternative: "Κωτσόβολος 2.jpg" imports as
// `kotsovolos-2` so both candidates survive for the operator to choose between.
// Without that rule the second file would silently overwrite the first.
//
// It validates each file, copies it into _raw/ and updates the manifest, so the
// image shows up in the next preview exactly like an automatically fetched one.
//
// WHAT IT CHECKS — the same floors the automated passes enforce, because a
// hand-supplied file is not automatically a good one:
//   • the id must exist in seedBrands.mjs (a typo'd filename is caught, not
//     silently ignored)
//   • the bytes must really be PNG/JPEG/SVG/WebP — an HTML error page saved as
//     .png is rejected, which has bitten this project before
//   • rasters must be at least 64px on the long edge, or they cannot be scaled to
//     the 512×512 mark canvas
//
// WHAT IT DELIBERATELY DOES NOT CHECK: whether the image is the RIGHT logo, or
// whether it survives the icon-only filter. Those are the operator's calls and
// are made from the preview, as with every other source.
//
// PROVENANCE: files imported here carry credit "operator-supplied (<date>)" and
// no license. That is weaker provenance than a Commons row, so ticket-04's legal
// note must keep listing it as its own path.

import { readFile, writeFile, mkdir, readdir, copyFile, unlink } from "node:fs/promises";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

import { SEED_BRANDS } from "./lib/logopaignio/seedBrands.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_DIR = join(ROOT, "public", "logopaignio", "_raw");
const MANIFEST = join(RAW_DIR, "manifest.json");
const DEFAULT_INBOX = join(ROOT, "public", "logopaignio", "_manual");

const MIN_RASTER_PX = 64;
const SIZE_WARN_BYTES = 60_000;

const looksLikeHtml = (buf) =>
  /^\s*(<!doctype html|<html|<head|<body)/i.test(buf.slice(0, 400).toString("latin1"));

/** Identify and measure by MAGIC BYTES — never trust the extension. */
function measure(buf) {
  if (looksLikeHtml(buf)) return { kind: "bin", w: 0, h: 0 };

  if (buf.length > 24 && buf.slice(1, 4).toString("latin1") === "PNG") {
    return { kind: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { kind: "jpg", h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return { kind: "jpg", w: 0, h: 0 };
  }
  if (
    buf.length > 30 &&
    buf.slice(0, 4).toString("latin1") === "RIFF" &&
    buf.slice(8, 12).toString("latin1") === "WEBP"
  ) {
    const fourcc = buf.slice(12, 16).toString("latin1");
    if (fourcc === "VP8X") {
      return { kind: "webp", w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    }
    if (fourcc === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { kind: "webp", w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
    }
    if (fourcc === "VP8 ") {
      return { kind: "webp", w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    }
    return { kind: "webp", w: 0, h: 0 };
  }
  const head = buf.slice(0, 4000).toString("utf8");
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) {
    const vb = head.match(/viewBox=["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    return vb
      ? { kind: "svg", w: Math.round(+vb[1]), h: Math.round(+vb[2]) }
      : { kind: "svg", w: 0, h: 0 };
  }
  return { kind: "bin", w: 0, h: 0 };
}

function inspectSvg(text) {
  return {
    paths: (text.match(/<path\b/g) ?? []).length,
    groups: (text.match(/<g\b/g) ?? []).length,
    embeddedRaster: (text.match(/<image\b/g) ?? []).length > 0,
    viewBox: text.match(/viewBox\s*=\s*"([^"]+)"/i)?.[1] ?? null,
  };
}

/** Fold to comparable letters: accents, case, punctuation and spacing removed. */
const fold = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * Resolve a filename stem to a seed id.
 *
 * Accepts the id itself, the display name, or any accept-list variant, because a
 * human naming 53 files will reach for the brand name rather than the slug. A
 * trailing " 2"/"-2" is stripped before matching and re-applied as an id suffix,
 * so alternatives stay side by side instead of overwriting each other.
 *
 * @returns {{id: string, seed: object, variant: string}|null}
 */
function resolveStem(stem, seeds) {
  const variantMatch = stem.match(/[\s_-]+(\d+)$/);
  const variant = variantMatch ? variantMatch[1] : "";
  const base = variantMatch ? stem.slice(0, variantMatch.index) : stem;
  const key = fold(base);
  if (!key) return null;

  for (const s of seeds) {
    if (s.id === base || fold(s.id) === key) {
      return { id: variant ? `${s.id}-${variant}` : s.id, seed: s, variant };
    }
  }
  // Display name next — an exact brand match is unambiguous.
  for (const s of seeds) {
    if (fold(s.brand) === key) {
      return { id: variant ? `${s.id}-${variant}` : s.id, seed: s, variant };
    }
  }

  // Accept-list LAST, and only when exactly one brand claims the name.
  //
  // Accept-lists deliberately overlap: Chipita's includes "7Days" (it makes the
  // product) and Attica Bank's includes "Attica" (so does the department store).
  // Matching them like a name silently files the operator's 7Days logo under
  // Chipita and their attica-stores logo under Attica Bank — both happened on the
  // first 53-file import. When more than one brand answers to a name, no guess is
  // better than the wrong one: refuse and let the operator disambiguate by using
  // the seed id in the filename.
  const claimants = seeds.filter((s) => s.accept.some((a) => fold(a) === key));
  if (claimants.length === 1) {
    const s = claimants[0];
    return { id: variant ? `${s.id}-${variant}` : s.id, seed: s, variant };
  }
  if (claimants.length > 1) {
    return { ambiguous: claimants.map((s) => s.id) };
  }
  return null;
}

async function main() {
  const inbox = process.argv[2] ? join(process.cwd(), process.argv[2]) : DEFAULT_INBOX;

  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(inbox, { recursive: true });

  let files;
  try {
    files = (await readdir(inbox)).filter((f) => !f.startsWith("."));
  } catch {
    console.error(`Cannot read ${inbox}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log(`No files in ${inbox}\n`);
    console.log("Drop images there named after their seed id (e.g. mythos.png, epsa.svg).");
    console.log("The preview prints the exact filename on every purple card.");
    return;
  }

  let manifest = [];
  try {
    manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    // no manifest yet
  }
  const byId = new Map(manifest.map((r) => [r.id, r]));

  console.log(`Plan F — importing ${files.length} operator-supplied images from ${inbox}\n`);

  const today = new Date().toISOString().slice(0, 10);
  let imported = 0;
  let rejected = 0;

  for (const f of files.sort()) {
    const stem = basename(f, extname(f));
    const hit = resolveStem(stem, SEED_BRANDS);

    if (!hit) {
      console.log(`  ✗ ${f.padEnd(30)} no brand matches "${stem}" — removed from the pool, or a typo`);
      rejected += 1;
      continue;
    }
    if (hit.ambiguous) {
      console.log(
        `  ✗ ${f.padEnd(30)} "${stem}" matches ${hit.ambiguous.length} brands (${hit.ambiguous.join(", ")}) — rename the file to one of those ids`,
      );
      rejected += 1;
      continue;
    }
    const { id, seed, variant } = hit;

    const buf = await readFile(join(inbox, f));
    const dim = measure(buf);

    if (dim.kind === "bin") {
      console.log(`  ✗ ${f.padEnd(30)} not a usable image (PNG/JPEG/SVG/WebP expected)`);
      rejected += 1;
      continue;
    }
    if (dim.kind !== "svg" && Math.max(dim.w, dim.h) < MIN_RASTER_PX) {
      console.log(`  ✗ ${f.padEnd(30)} only ${dim.w}×${dim.h} — too small for the 512px canvas`);
      rejected += 1;
      continue;
    }

    const ext = dim.kind;
    const outName = `${id}.${ext}`;

    // OPERATOR SUPERSEDES AUTOMATION (their explicit rule). A supplied image wins
    // over whatever a fetch pass found, and the superseded file is deleted rather
    // than left orphaned in _raw/ — the operator looked at the preview and judged
    // theirs better, so keeping both would only re-introduce the doubt.
    const prev = byId.get(id);
    if (prev?.file && prev.file !== outName) {
      try {
        await unlink(join(RAW_DIR, prev.file));
      } catch {
        // already gone
      }
    }

    await copyFile(join(inbox, f), join(RAW_DIR, outName));

    byId.set(id, {
      id,
      brand: variant ? `${seed.brand} (εναλλακτικό ${variant})` : seed.brand,
      sector: seed.sector,
      accept: seed.accept,
      note: variant
        ? `Εναλλακτική εικόνα ${variant} για «${seed.brand}» — διάλεξε ποια κρατάς.`
        : (seed.note ?? ""),
      status: "ok",
      file: outName,
      ext,
      bytes: buf.length,
      heavy: buf.length > SIZE_WARN_BYTES,
      svg: ext === "svg" ? inspectSvg(buf.toString("utf8")) : null,
      source: "manual",
      sourceUrl: "",
      license: "© the company — operator-supplied, no stated license",
      credit: `operator-supplied (${today})`,
      pixels: dim.w && dim.h ? `${dim.w}×${dim.h}` : "",
    });

    console.log(
      `  ✓ ${f.padEnd(30)} → ${id.padEnd(20)} ${String(buf.length).padStart(7)} B  ${(dim.w && dim.h ? `${dim.w}×${dim.h}` : "").padEnd(11)}${ext}`,
    );
    imported += 1;
  }

  const merged = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(MANIFEST, `${JSON.stringify(merged, null, 2)}\n`);

  const ok = merged.filter((r) => r.status === "ok").length;
  const manual = merged.filter((r) => r.status === "manual").length;
  console.log(
    `\nImported ${imported}${rejected ? `, rejected ${rejected}` : ""} · manifest now ${ok}/${merged.length} with an asset · ${manual} still awaiting an image`,
  );
  console.log("Next: npm run logopaignio:preview");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
