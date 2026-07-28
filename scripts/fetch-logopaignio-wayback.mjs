// Λογοπαίγνιο logo fetcher — PLAN E: archived homepages (Wayback Machine).
//
// WHY: a defunct brand has no live site by definition, and some live brands sit
// behind anti-bot filters that answer 403 no matter what headers we send. The
// Internet Archive has neither problem — it holds the homepage as it was, and it
// serves crawlers happily.
//
// This is the LAST automated resort, run after Commons (A), official sites (B/C)
// and Wikipedia (D). It only chases brands that still have no asset.
//
// The archived page is scraped exactly like a live one: same candidate ordering
// (named logo assets → og:image → icons), same magic-byte format check, same
// dimension floor. The one difference is URL rewriting — Wayback prefixes every
// asset with /web/<timestamp>/, and asking for the `id_` variant gets the
// ORIGINAL bytes rather than the archive's rewritten copy.
//
// CURRENCY WARNING. A snapshot is a point in time, so this pass can hand back a
// logo the company has since replaced — which directly violates the pool's
// "current logo only" rule. The snapshot date is therefore recorded in `credit`
// and surfaced on the preview card. For a DEFUNCT brand (Ήβη, Jetoil) an old mark
// is the point. For a LIVE brand, check the date before approving.
//
// LEGAL: same posture as Plan B — the company's trademark, no stated license.
// `credit` records the archive URL and the snapshot date.
//
// Run:  node scripts/fetch-logopaignio-wayback.mjs
//       node scripts/fetch-logopaignio-wayback.mjs --only ivi,coral

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { SEED_BRANDS } from "./lib/logopaignio/seedBrands.mjs";
import { OFFICIAL_SITES } from "./lib/logopaignio/officialSites.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "..", "public", "logopaignio", "_raw");
const MANIFEST = join(RAW_DIR, "manifest.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 25_000; // the archive is slower than a live host
const PAUSE_MS = 900; // and asks not to be hammered
const MIN_RASTER_PX = 64;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, asText) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "*/*" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, status: res.status };
    return asText
      ? { ok: true, text: await res.text(), url: res.url }
      : { ok: true, buf: Buffer.from(await res.arrayBuffer()), url: res.url };
  } finally {
    clearTimeout(timer);
  }
}

const looksLikeHtml = (buf) =>
  /^\s*(<!doctype html|<html|<head|<body)/i.test(buf.slice(0, 400).toString("latin1"));

/** Real pixel dimensions from the bytes — never from the markup that offered them. */
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
    if (fourcc === "VP8X") return { kind: "webp", w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (fourcc === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { kind: "webp", w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
    }
    if (fourcc === "VP8 ") return { kind: "webp", w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    return { kind: "webp", w: 0, h: 0 };
  }
  const head = buf.slice(0, 4000).toString("utf8");
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--.*?-->\s*)*<svg[\s>]/is.test(head)) {
    const vb = head.match(/viewBox=["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    return vb
      ? { kind: "svg", w: Math.round(+vb[1]), h: Math.round(+vb[2]) }
      : { kind: "svg", w: 0, h: 0 };
  }
  return { kind: "bin", w: 0, h: 0 };
}

const extFor = (kind) =>
  ({ png: "png", jpg: "jpg", svg: "svg", webp: "webp" })[kind] ?? "bin";

/** Ask the archive for the closest usable snapshot of a host. */
async function findSnapshot(domain) {
  const bare = domain.replace(/^https?:\/\//, "");
  let res;
  try {
    res = await get(`https://archive.org/wayback/available?url=${encodeURIComponent(bare)}`, true);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  try {
    const closest = JSON.parse(res.text)?.archived_snapshots?.closest;
    if (!closest?.available || !closest.url) return null;
    return { url: closest.url.replace(/^http:/, "https:"), timestamp: closest.timestamp };
  } catch {
    return null;
  }
}

/**
 * Rewrite an archived asset URL to the `id_` form.
 *
 * Wayback serves two variants: the default rewrites the page so archived links
 * point back into the archive, while `<timestamp>id_` returns the ORIGINAL bytes.
 * For an image the difference matters — without `id_` the archive may return its
 * own wrapper HTML instead of the file.
 */
function originalBytesUrl(u) {
  return u.replace(/(\/web\/\d{14})(?!id_)/, "$1id_");
}

function candidates(html, pageUrl, hint) {
  const abs = (u) => {
    try {
      return new URL(u, pageUrl).href;
    } catch {
      return null;
    }
  };
  const out = [];
  const push = (u, why) => {
    const a = u && abs(u);
    if (a && !a.startsWith("data:") && !out.some((c) => c.url === a)) out.push({ url: a, why });
  };

  const named = [
    ...[...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/["']([^"']+\.(?:svg|png|jpg|jpeg|webp)(?:\?[^"']*)?)["']/gi)].map((m) => m[1]),
  ].filter((u) => /logo|brand/i.test(u));

  if (hint) {
    for (const u of named.filter((x) => x.toLowerCase().includes(hint.toLowerCase()))) push(u, "hint");
  }
  for (const u of named.filter((x) => /\.svg(\?|$)/i.test(x))) push(u, "logo-svg");
  for (const u of named) push(u, "logo-img");

  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  push(og?.[1], "og:image");

  const icons = [...html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi)].map((m) => m[0]);
  for (const tag of icons.sort(
    (a, b) =>
      Number(b.match(/sizes=["'](\d+)/i)?.[1] ?? 0) - Number(a.match(/sizes=["'](\d+)/i)?.[1] ?? 0),
  )) {
    push(tag.match(/href=["']([^"']+)["']/i)?.[1], "icon");
  }
  return out;
}

async function processOne(site, seed) {
  const snap = await findSnapshot(site.domain);
  if (!snap) return { id: site.id, ok: false, reason: "no Wayback snapshot" };

  let page;
  try {
    page = await get(snap.url, true);
  } catch {
    return { id: site.id, ok: false, reason: "snapshot unreachable" };
  }
  if (!page.ok) return { id: site.id, ok: false, reason: `snapshot HTTP ${page.status}` };

  const cands = candidates(page.text, page.url, site.hint);
  if (cands.length === 0) return { id: site.id, ok: false, reason: "no logo asset in snapshot" };

  const rejected = [];
  for (const cand of cands.slice(0, 8)) {
    let res;
    try {
      res = await get(originalBytesUrl(cand.url), false);
    } catch {
      rejected.push(`${cand.why}: unreachable`);
      continue;
    }
    if (!res.ok) {
      rejected.push(`${cand.why}: HTTP ${res.status}`);
      continue;
    }
    const dim = measure(res.buf);
    if (dim.kind === "bin") {
      rejected.push(`${cand.why}: unusable format`);
      continue;
    }
    if (dim.kind !== "svg" && Math.max(dim.w, dim.h) < MIN_RASTER_PX) {
      rejected.push(`${cand.why}: only ${dim.w}×${dim.h}`);
      continue;
    }

    const ext = extFor(dim.kind);
    const file = `${site.id}.${ext}`;
    await writeFile(join(RAW_DIR, file), res.buf);

    const date = `${snap.timestamp.slice(0, 4)}-${snap.timestamp.slice(4, 6)}-${snap.timestamp.slice(6, 8)}`;
    return {
      id: site.id,
      ok: true,
      row: {
        id: seed.id,
        brand: seed.brand,
        sector: seed.sector,
        accept: seed.accept,
        note: seed.note ?? "",
        status: "ok",
        file,
        ext,
        bytes: res.buf.length,
        heavy: res.buf.length > 60_000,
        svg: dim.kind === "svg" ? { paths: 0, groups: 0, embeddedRaster: false, viewBox: null } : null,
        source: "wayback",
        snapshotDate: date,
        sourceUrl: cand.url,
        license: "© the company — no stated license (archived copy)",
        credit: `${site.domain} via Wayback Machine, snapshot ${date}`,
        pixels: dim.w && dim.h ? `${dim.w}×${dim.h}` : "",
        via: cand.why,
      },
    };
  }
  return { id: site.id, ok: false, reason: `no usable asset (tried ${rejected.length}: ${rejected.slice(0, 3).join("; ")})` };
}

async function main() {
  const onlyArg = process.argv.indexOf("--only");
  const only =
    onlyArg !== -1 && process.argv[onlyArg + 1]
      ? new Set(process.argv[onlyArg + 1].split(","))
      : null;

  await mkdir(RAW_DIR, { recursive: true });

  let manifest = [];
  try {
    manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    // none yet
  }
  const byId = new Map(manifest.map((r) => [r.id, r]));
  const seedById = new Map(SEED_BRANDS.map((s) => [s.id, s]));

  const targets = OFFICIAL_SITES.filter((s) => {
    if (!seedById.has(s.id)) return false;
    if (only) return only.has(s.id);
    return byId.get(s.id)?.status !== "ok";
  });

  console.log(`Plan E — Wayback snapshots for ${targets.length} brands without an asset\n`);

  let found = 0;
  for (const site of targets) {
    const r = await processOne(site, seedById.get(site.id));
    if (r.ok) {
      byId.set(r.row.id, r.row);
      found += 1;
      console.log(
        `  ✓ ${r.id.padEnd(22)} ${String(r.row.bytes).padStart(8)} B  ${(r.row.pixels || "").padEnd(11)}${r.row.ext.padEnd(5)} ${r.row.snapshotDate}  via ${r.row.via}`,
      );
    } else {
      console.log(`  ✗ ${r.id.padEnd(22)} ${r.reason}`);
    }
    await sleep(PAUSE_MS);
  }

  const merged = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(MANIFEST, `${JSON.stringify(merged, null, 2)}\n`);

  const withAsset = merged.filter((r) => r.status === "ok").length;
  console.log(
    `\nPlan E recovered ${found}/${targets.length} · manifest now ${withAsset}/${merged.length} with an asset`,
  );
  console.log("Next: node scripts/preview-logopaignio.mjs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
