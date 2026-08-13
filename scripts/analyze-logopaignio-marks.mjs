// Λογοπαίγνιο — mark isolation worksheet.
//
//   node scripts/analyze-logopaignio-marks.mjs
//   -> .claude/aiHelper/html/logopaignio-marks.html   (one page, all staged assets)
//   -> .claude/aiHelper/html/logopaignio-marks.json   (the measurements, for the cropper)
//
// Reads public/logopaignio/_raw/ and NEVER writes to it. Nothing here is
// destructive: the output is a crop BOX per asset, not a cropped image, so a
// better algorithm later costs a re-run rather than a re-download.
//
// Like preview-logopaignio.mjs this page is a WORKSHEET, not a decision. The
// geometry says where a boundary is; whether the resulting mark is recognizable
// once the name is gone stays the operator's call.

import { readdir, writeFile, readFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright";
import {
  EXTRACT_SVG_BOXES,
  classify,
  inkProfile,
  profileToBoxes,
  MIN_GAP_RATIO,
  MIN_GAP_RATIO_RASTER,
} from "./lib/logopaignio/markGeometry.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_DIR = join(ROOT, "public", "logopaignio", "_raw");
const OUT_HTML = join(ROOT, ".claude", "aiHelper", "html", "logopaignio-marks.html");
const OUT_JSON = join(ROOT, ".claude", "aiHelper", "html", "logopaignio-marks.json");

const RASTER_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/** Section copy. `kind` values come from markGeometry.classify(). */
const KINDS = {
  horizontal: {
    title: "Σύμβολο δίπλα στο όνομα",
    note: "Κόβεται κάθετα. Το σύμβολο κρατιέται, το όνομα φεύγει.",
  },
  vertical: {
    title: "Σύμβολο πάνω / κάτω από το όνομα",
    note: "Κόβεται οριζόντια. Προσοχή: αν το λογότυπο έχει δύο σειρές κειμένου, το κόψιμο μπορεί να πέσει ανάμεσά τους.",
  },
  emblem: {
    title: "Έμβλημα — ή ήδη μόνο σύμβολο",
    note: "Δεν υπάρχει κενό να κοπεί: το όνομα είναι μέσα στο σχήμα, ή το αρχείο είναι ήδη καθαρό σύμβολο. Θέλει μάτι, όχι κόψιμο.",
  },
  wordmark: {
    title: "Μόνο όνομα — κόβεται από το παιχνίδι",
    note: "Δεν υπάρχει ξεχωριστό σύμβολο. Αυτά αποτυγχάνουν στο φίλτρο icon-only.",
  },
  unreadable: {
    title: "Δεν αποδίδεται",
    note: "Το αρχείο δεν εμφανίζεται χωρίς εξωτερικό styling. Χρειάζεται χειροκίνητο έλεγχο.",
  },
};
const ORDER = ["horizontal", "vertical", "emblem", "wordmark", "unreadable"];

/** Strips the outer <svg> wrapper so the markup can be re-hosted in our own viewBox. */
function svgInner(source) {
  return source.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}

/**
 * Makes one file's markup safe to inline beside 94 others.
 *
 * Illustrator exports name their classes `.st0`, `.st1`, ... starting from zero in
 * every file, so 17 assets in this pool each define `.st0`. Inlined into a single
 * document they overwrite one another and most logos render with the wrong fill or
 * none at all. Same story for `id=`/`url(#…)` references (gradients, clip paths).
 *
 * Both are rewritten with a per-asset prefix so each card keeps its own styling.
 */
function isolateSvgMarkup(inner, token) {
  let out = inner;

  // 1. Class selectors in <style> blocks, and the class="" attributes using them.
  out = out.replace(/\.st(\d+)\b/g, `.${token}-st$1`);
  out = out.replace(/class="([^"]*)"/g, (whole, names) => {
    const scoped = names
      .trim()
      .split(/\s+/)
      .map((n) => (/^st\d+$/.test(n) ? `${token}-${n}` : n))
      .join(" ");
    return `class="${scoped}"`;
  });

  // 2. Element ids and the url(#…) / href="#…" references that point at them.
  const ids = new Set();
  for (const [, id] of out.matchAll(/\bid="([^"]+)"/g)) ids.add(id);
  for (const id of ids) {
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\bid="${safe}"`, "g"), `id="${token}-${id}"`);
    out = out.replace(new RegExp(`url\\(#${safe}\\)`, "g"), `url(#${token}-${id})`);
    out = out.replace(new RegExp(`(href)="#${safe}"`, "g"), `$1="#${token}-${id}"`);
  }

  return out;
}

/** Filename -> a token safe for use inside CSS selectors and ids. */
function tokenFor(file) {
  return file.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]+/g, "-");
}

async function measureSvg(page, source) {
  await page.setContent(`<body style="margin:0">${source}</body>`, { timeout: 8000 });
  const measured = await page.evaluate(EXTRACT_SVG_BOXES);
  if (!measured || !measured.boxes.length || !measured.content) return null;
  const result = classify(measured.boxes, measured.content, { minGap: MIN_GAP_RATIO });
  return { ...result, content: measured.content, elements: measured.boxes.length };
}

async function measureRaster(file) {
  const raw = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const profile = inkProfile(raw);
  const { boxes, vBoxes, content } = profileToBoxes(profile);
  if (!content) return null;

  // Horizontal first (matches the vector pass), then the transposed run for stacked marks.
  let result = classify(boxes, content, { minGap: MIN_GAP_RATIO_RASTER });
  if (result.kind === "emblem" || result.kind === "wordmark") {
    const stacked = classify(vBoxes, content, { minGap: MIN_GAP_RATIO_RASTER });
    if (stacked.kind === "vertical") result = stacked;
  }
  return {
    ...result,
    content,
    elements: boxes.length,
    alphaBackground: profile.alphaBackground,
    pixels: `${profile.width}×${profile.height}`,
  };
}

/**
 * Data URI thumbnail. Transparency is PRESERVED so the card's checkerboard shows
 * through — flattening onto white would hide white-filled marks entirely, which is
 * the bug this page had.
 */
async function thumb(file, box, size) {
  let pipeline = sharp(file).ensureAlpha();
  if (box) {
    const [x, y, w, h] = box.map(Math.round);
    pipeline = pipeline.extract({
      left: Math.max(0, x),
      top: Math.max(0, y),
      width: Math.max(1, w),
      height: Math.max(1, h),
    });
  }
  const buf = await pipeline
    .resize(size.w, size.h, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/**
 * SVG entries carry live markup; raster entries carry a data URI. Markup must be
 * embedded as-is — wrapping it in <img src=...> renders it as escaped text.
 */
function visual(entry, which) {
  const markup = which === "full" ? entry.fullSvg : entry.markSvg;
  if (markup) return markup;
  const uri = which === "full" ? entry.fullThumb : entry.markThumb;
  return uri ? `<img src="${uri}" alt="">` : '<span class="dash">—</span>';
}

function card(entry) {
  const meta = [entry.pixels ?? `${entry.elements} σχήματα`, entry.background]
    .filter(Boolean)
    .join(" · ");
  return `<article class="card${entry.ambiguous ? " card--check" : ""}">
  <h3>${entry.file}</h3>
  <p class="meta">${meta}${entry.ambiguous ? ' · <b class="warn">θέλει έλεγχο</b>' : ""}</p>
  <div class="pair">
    <div><div class="frame">${visual(entry, "full")}</div><p class="cap">πλήρες</p></div>
    <div><div class="frame">${visual(entry, "mark")}</div><p class="cap">σύμβολο</p></div>
  </div>
</article>`;
}

function renderPage(entries) {
  const counts = Object.fromEntries(
    ORDER.map((k) => [k, entries.filter((e) => e.kind === k).length]),
  );
  const checks = entries.filter((e) => e.ambiguous).length;
  const usable = counts.horizontal + counts.vertical + counts.emblem;

  const sections = ORDER.filter((k) => counts[k])
    .map((kind) => {
      const group = entries.filter((e) => e.kind === kind);
      return `<section>
  <h2>${KINDS[kind].title} <span class="badge">${group.length}</span></h2>
  <p class="note">${KINDS[kind].note}</p>
  <div class="grid">${group.map(card).join("")}</div>
</section>`;
    })
    .join("");

  // The viewport tag is not optional: the operator reads these on an iPhone, and
  // without it iOS lays the page out at 980px and shrinks it to fit. There is no
  // script on this page, so it survives Quick Look (which runs none) as-is.
  return `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Λογοπαίγνιο — απομόνωση συμβόλου</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 13px/1.5 system-ui, sans-serif; margin: 0; padding: 20px;
         background: #f4f4f5; color: #18181b; }
  h1 { font-size: 21px; margin: 0 0 4px; }
  .lede { color: #52525b; margin: 0 0 16px; max-width: 70ch; }
  h2 { font-size: 15px; margin: 0 0 4px; }
  section { margin-top: 30px; }
  .note { color: #71717a; font-size: 12px; margin: 0 0 12px; max-width: 70ch; }
  .badge { font-size: 11px; padding: 1px 7px; border-radius: 99px;
           background: #e4e4e7; color: #3f3f46; margin-left: 6px; vertical-align: middle; }
  .summary { background: #fff; border: 1px solid #e4e4e7; border-radius: 8px;
             padding: 14px 16px; line-height: 2.1; }
  .summary b { font-size: 20px; }
  .summary span { margin-right: 22px; white-space: nowrap; }
  .warn { color: #b45309; }
  .grid { display: grid; gap: 10px;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  .card { background: #fff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 9px; }
  .card--check { border-color: #f59e0b; background: #fffbeb; }
  .card h3 { font-size: 11px; margin: 0; font-weight: 600; word-break: break-all; }
  .meta { font-size: 9px; color: #a1a1aa; margin: 1px 0 7px; }
  .pair { display: grid; grid-template-columns: 1fr 96px; gap: 8px; align-items: center; }
  /* Checkerboard, not flat white: 12 assets in the pool are white-filled and would
     otherwise be invisible against a white card. */
  .frame { border: 1px solid #e4e4e7; border-radius: 5px; height: 92px;
           display: flex; align-items: center; justify-content: center; overflow: hidden;
           background-color: #fff;
           background-image:
             linear-gradient(45deg, #e9e9ec 25%, transparent 25%, transparent 75%, #e9e9ec 75%),
             linear-gradient(45deg, #e9e9ec 25%, transparent 25%, transparent 75%, #e9e9ec 75%);
           background-size: 14px 14px;
           background-position: 0 0, 7px 7px; }
  .frame img, .frame svg { max-width: 100%; max-height: 100%; display: block; }
  .cap { font-size: 9px; color: #71717a; text-align: center; margin: 3px 0 0; }
  .dash { font-size: 10px; color: #a1a1aa; }
  @media (max-width: 700px) {
    body { padding: 14px; }
    .grid { grid-template-columns: 1fr; }
    .pair { grid-template-columns: 1fr 80px; }
    .summary { line-height: 1.9; }
    .summary span { display: inline-block; margin-right: 14px; }
  }
  @media (prefers-color-scheme: dark) {
    body { background: #18181b; color: #f4f4f5; }
    .summary, .card { background: #27272a; border-color: #3f3f46; }
    .card--check { background: #422006; border-color: #b45309; }
    .frame { background: #fff; border-color: #3f3f46; }
    .badge { background: #3f3f46; color: #d4d4d8; }
    .lede, .note, .meta, .cap { color: #a1a1aa; }
  }
</style>
<h1>Λογοπαίγνιο — απομόνωση συμβόλου</h1>
<p class="lede">${entries.length} αρχεία στο <code>_raw/</code>. Αριστερά το πλήρες λογότυπο, δεξιά
το σύμβολο που θα κρατηθεί. Κίτρινη κάρτα = ο αλγόριθμος δεν ξεχωρίζει ποια πλευρά
είναι το σύμβολο και θέλει τη δική σου απόφαση.</p>
<div class="summary">
  ${ORDER.filter((k) => counts[k]).map((k) => `<span><b>${counts[k]}</b> ${KINDS[k].title}</span>`).join("")}
  <br><span><b>${usable}</b> πιθανά χρησιμοποιήσιμα</span>
  <span class="warn"><b>${checks}</b> κάρτες θέλουν έλεγχο</span>
</div>
${sections}`;
}

async function main() {
  const files = (await readdir(RAW_DIR))
    .filter((f) => f !== "manifest.json")
    .sort((a, b) => a.localeCompare(b));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const entries = [];

  for (const file of files) {
    const abs = join(RAW_DIR, file);
    const ext = extname(file).toLowerCase();
    const isSvg = ext === ".svg";
    const isRaster = RASTER_EXT.has(ext);
    if (!isSvg && !isRaster) continue;

    try {
      if (isSvg) {
        const source = await readFile(abs, "utf8");
        const measured = await measureSvg(page, source);
        if (!measured) {
          entries.push({ file, kind: "unreadable", elements: 0, ambiguous: false });
          continue;
        }
        const inner = isolateSvgMarkup(svgInner(source), tokenFor(file));
        const viewBox = measured.content.join(" ");
        entries.push({
          file,
          kind: measured.kind,
          ambiguous: measured.ambiguous,
          elements: measured.elements,
          markBox: measured.markBox,
          cutAxis: measured.cutAxis,
          cutAt: measured.cutAt,
          // Inline SVG rather than a raster thumb: sharp cannot render these
          // reliably (several need external styling) and the browser already did.
          fullSvg: `<svg preserveAspectRatio="xMidYMid meet" viewBox="${viewBox}">${inner}</svg>`,
          markSvg: measured.markBox
            ? `<svg preserveAspectRatio="xMidYMid meet" viewBox="${measured.markBox.join(" ")}">${inner}</svg>`
            : null,
        });
      } else {
        const measured = await measureRaster(abs);
        if (!measured) {
          entries.push({ file, kind: "unreadable", elements: 0, ambiguous: false });
          continue;
        }
        entries.push({
          file,
          kind: measured.kind,
          ambiguous: measured.ambiguous,
          elements: measured.elements,
          markBox: measured.markBox,
          cutAxis: measured.cutAxis,
          cutAt: measured.cutAt,
          pixels: measured.pixels,
          background: measured.alphaBackground ? "διαφανές" : "αδιαφανές",
          fullThumb: await thumb(abs, null, { w: 260, h: 120 }),
          markThumb: measured.markBox ? await thumb(abs, measured.markBox, { w: 92, h: 92 }) : null,
        });
      }
    } catch (error) {
      entries.push({
        file,
        kind: "unreadable",
        elements: 0,
        ambiguous: false,
        error: String(error.message).slice(0, 80),
      });
    }
  }

  await browser.close();

  await writeFile(OUT_HTML, renderPage(entries), "utf8");
  // The JSON is the cropper's input, so it carries measurements only — the inline
  // thumbnails would balloon it by megabytes for no downstream use.
  const VISUAL_FIELDS = new Set(["fullThumb", "markThumb", "fullSvg", "markSvg"]);
  const measurements = entries.map((entry) =>
    Object.fromEntries(Object.entries(entry).filter(([key]) => !VISUAL_FIELDS.has(key))),
  );
  await writeFile(OUT_JSON, JSON.stringify(measurements, null, 2), "utf8");

  const counts = Object.fromEntries(ORDER.map((k) => [k, entries.filter((e) => e.kind === k).length]));
  console.log(`analysed ${entries.length} assets`);
  for (const k of ORDER) if (counts[k]) console.log(`  ${k.padEnd(11)} ${counts[k]}`);
  console.log(`  ambiguous   ${entries.filter((e) => e.ambiguous).length}`);
  console.log(`\nwrote ${OUT_HTML}`);
}

await main();
