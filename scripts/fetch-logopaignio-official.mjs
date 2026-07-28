// Λογοπαίγνιο — PLAN B fetcher: pull logo assets from the companies' own sites.
//
//   node scripts/fetch-logopaignio-official.mjs
//   node scripts/fetch-logopaignio-official.mjs --only vikos,ion
//
// Runs AFTER the Commons pass (fetch-logopaignio-logos.mjs) and fills its gaps.
// Downloads into public/logopaignio/_raw/ and merges rows into the same
// manifest.json, tagged `source: "official"`, so one preview covers both passes.
//
// Strategy per site, best first:
//   1. an <img src> or asset URL whose path mentions logo/brand   ← usually the real logo
//   2. og:image                                                   ← usually a share card, coarser
//   3. the largest declared <link rel=icon>                       ← last resort, often tiny
//
// Two traps measured on 2026-07-27, both handled here:
//   • favicon `sizes` attributes LIE — apivita.com advertises a 1024×1024
//     apple-touch-icon that 404s; eydap.gr's "favicon.png" is 16×16. So the icon
//     path is a fallback and every candidate's REAL dimensions are measured after
//     download, not trusted from markup.
//   • many sites 403 a non-browser User-Agent (skroutz.gr did), so we send a
//     normal browser UA and follow redirects.
//
// Nothing here decides anything: assets land in gitignored staging for the same
// operator eye check as the Commons pass.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { SEED_BRANDS } from "./lib/logopaignio/seedBrands.mjs";
import { OFFICIAL_SITES } from "./lib/logopaignio/officialSites.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "..", "public", "logopaignio", "_raw");
const MANIFEST = join(RAW_DIR, "manifest.json");

// A real browser UA: several Greek sites 403 anything that looks scripted.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * The rest of what a browser sends. A correct UA alone is not enough for the
 * stricter filters: measured 2026-07-28, adding these opened themart.gr,
 * altis.com.gr and goldenstarferries.gr, all of which 403'd on UA alone. The
 * Sec-Fetch-* set is what a top-level navigation looks like; sending a UA that
 * claims to be Chrome while omitting them is itself a bot signal.
 *
 * It is not a bypass for real defences — pizzafan.gr, winmasters.gr, tsakiris.gr
 * and orizonins.gr still 403 with a full header set, and those need manual
 * sourcing rather than a cleverer request.
 */
const BROWSER_HEADERS = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "el-GR,el;q=0.9,en-US;q=0.8,en;q=0.7",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

const CONCURRENCY = 3;
const REQUEST_TIMEOUT_MS = 15_000;
const SIZE_WARN_BYTES = 60_000;
/** Below this a raster asset is too small to blur/scale to the 512px canvas. */
const MIN_RASTER_PX = 64;
/**
 * Plan C floor. Higher than MIN_RASTER_PX because the favicon service answers a
 * miss with a 16×16 default globe instead of a 404 — measuring the bytes is the
 * only way to tell a real hit from a placeholder.
 */
const MIN_FAVICON_PX = 128;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, asText) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, status: res.status };
    return asText
      ? { ok: true, status: res.status, text: await res.text(), url: res.url }
      : { ok: true, status: res.status, buf: Buffer.from(await res.arrayBuffer()), url: res.url };
  } finally {
    clearTimeout(timer);
  }
}

/** True when the bytes are an HTML document (a 404/error page served with status 200). */
function looksLikeHtml(buf) {
  return /^\s*(<!doctype\s+html|<html[\s>])/i.test(buf.slice(0, 400).toString("utf8"));
}

/** Real pixel dimensions, read from the bytes — never from the markup that offered them. */
function measure(buf) {
  if (looksLikeHtml(buf)) return { kind: "bin", w: 0, h: 0 };
  if (buf.length > 24 && buf.slice(1, 4).toString("latin1") === "PNG") {
    return { kind: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) {
    // JPEG: walk the segment chain to the SOF marker for the true size.
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
  const head = buf.slice(0, 4000).toString("utf8");
  // An HTML error page often CONTAINS an inline <svg> (an icon in its chrome), so
  // "contains <svg>" is not enough — geniki-taxydromiki saved a whole error page
  // as logo.svg that way. Require the document to actually BE an SVG: no HTML
  // doctype/root, and <svg> as the first tag.
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--.*?-->\s*)*<svg[\s>]/is.test(head)) {
    const vb = head.match(/viewBox=["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (vb) return { kind: "svg", w: Math.round(+vb[1]), h: Math.round(+vb[2]) };
    return { kind: "svg", w: 0, h: 0 };
  }
  // WebP: "RIFF" .... "WEBP". Added 2026-07-28 — it was falling through to `bin`
  // and being rejected as an unusable format, which silently cost us every site
  // that had modernised its images (ipiros.gr serves logo.webp and nothing else).
  // Both Next.js and every target browser handle WebP, so there is no reason to
  // refuse it. Dimensions come from the VP8 chunk variant in use.
  if (
    buf.length > 30 &&
    buf.slice(0, 4).toString("latin1") === "RIFF" &&
    buf.slice(8, 12).toString("latin1") === "WEBP"
  ) {
    const fourcc = buf.slice(12, 16).toString("latin1");
    if (fourcc === "VP8X") {
      return {
        kind: "webp",
        w: 1 + buf.readUIntLE(24, 3),
        h: 1 + buf.readUIntLE(27, 3),
      };
    }
    if (fourcc === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { kind: "webp", w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
    }
    if (fourcc === "VP8 ") {
      return {
        kind: "webp",
        w: buf.readUInt16LE(26) & 0x3fff,
        h: buf.readUInt16LE(28) & 0x3fff,
      };
    }
    return { kind: "webp", w: 0, h: 0 };
  }
  if (head.startsWith("GIF")) return { kind: "gif", w: 0, h: 0 };
  if (/^\x00\x00\x01\x00/.test(head)) return { kind: "ico", w: 0, h: 0 };
  return { kind: "bin", w: 0, h: 0 };
}

const extFor = (kind) =>
  ({ png: "png", jpg: "jpg", svg: "svg", gif: "gif", ico: "ico", webp: "webp" })[kind] ?? "bin";

/** Collect candidate asset URLs from a homepage, best-first. */
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

  // 1. explicit logo/brand assets — the real logo far more often than not
  const named = [
    ...[...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/["']([^"']+\.(?:svg|png|jpg|jpeg|webp)(?:\?[^"']*)?)["']/gi)].map(
      (m) => m[1],
    ),
  ].filter((u) => /logo|brand/i.test(u));

  // A hint (e.g. "EKO_Logo") wins over a generic /logo.png on the same page.
  if (hint) {
    for (const u of named.filter((x) => x.toLowerCase().includes(hint.toLowerCase()))) {
      push(u, "hint");
    }
  }
  // Prefer SVG among the rest — it scales to the 512px canvas losslessly.
  for (const u of named.filter((x) => /\.svg(\?|$)/i.test(x))) push(u, "logo-svg");
  for (const u of named) push(u, "logo-img");

  // 2. og:image — usually a share card (may include the name), still useful
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  push(og?.[1], "og:image");

  // 3. icons, largest declared first — sizes are unreliable, so we verify later
  const icons = [...html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi)].map((m) => m[0]);
  const withSize = icons
    .map((tag) => ({
      href: tag.match(/href=["']([^"']+)["']/i)?.[1],
      size: Number(tag.match(/sizes=["'](\d+)/i)?.[1] ?? 0),
      apple: /apple-touch/i.test(tag),
    }))
    .filter((i) => i.href)
    .sort((a, b) => b.size - a.size || Number(b.apple) - Number(a.apple));
  for (const i of withSize) push(i.href, `icon${i.size ? `-${i.size}` : ""}`);

  return out;
}

async function processSite(site) {
  const seed = SEED_BRANDS.find((s) => s.id === site.id);
  const base = {
    id: site.id,
    brand: seed?.brand ?? site.id,
    sector: seed?.sector ?? "",
    accept: seed?.accept ?? [],
    note: seed?.note ?? "",
    source: "official",
    site: site.domain,
  };

  const home = site.domain.startsWith("http") ? site.domain : `https://${site.domain}`;

  let page;
  try {
    page = await get(home, true);
  } catch (err) {
    return { ...base, status: "error", reason: `site unreachable (${err.message})` };
  }
  if (!page.ok) return { ...base, status: "error", reason: `homepage HTTP ${page.status}` };

  const cands = candidates(page.text, page.url ?? home, site.hint);
  if (cands.length === 0) return { ...base, status: "not-found", reason: "no logo asset on page" };

  // Try candidates in order; accept the first that downloads AND measures usable.
  const rejected = [];
  for (const cand of cands.slice(0, 8)) {
    let res;
    try {
      res = await get(cand.url, false);
    } catch {
      rejected.push(`${cand.why}: unreachable`);
      continue;
    }
    if (!res.ok) {
      rejected.push(`${cand.why}: HTTP ${res.status}`);
      continue;
    }
    const dim = measure(res.buf);
    if (dim.kind === "bin" || dim.kind === "ico") {
      rejected.push(`${cand.why}: unusable format`);
      continue;
    }
    // A raster smaller than the canvas would have to be upscaled — reject and
    // keep looking. (This is what saves us from eydap.gr's 16×16 "favicon.png".)
    if (dim.kind !== "svg" && Math.max(dim.w, dim.h) < MIN_RASTER_PX) {
      rejected.push(`${cand.why}: only ${dim.w}×${dim.h}`);
      continue;
    }

    const ext = extFor(dim.kind);
    const file = `${site.id}.${ext}`;
    await writeFile(join(RAW_DIR, file), res.buf);

    return {
      ...base,
      status: "ok",
      file,
      ext,
      bytes: res.buf.length,
      heavy: res.buf.length > SIZE_WARN_BYTES,
      width: dim.w || undefined,
      height: dim.h || undefined,
      aspect: dim.w && dim.h ? +(dim.w / dim.h).toFixed(2) : undefined,
      pickedBy: cand.why,
      sourceUrl: cand.url,
      descriptionUrl: page.url ?? home,
      license: "© the company — no stated license",
      restrictions: "trademarked",
      credit: `${site.domain} (retrieved ${new Date().toISOString().slice(0, 10)})`,
      rejectedCandidates: rejected.length ? rejected : undefined,
    };
  }

  return {
    ...base,
    status: "not-found",
    reason: `no usable asset (tried ${cands.length}: ${rejected.slice(0, 3).join("; ")})`,
  };
}

/**
 * PLAN C — Google's public favicon service, for sites Plan B cannot reach.
 *
 * The remaining failures are anti-bot defences, not missing logos: several return
 * 403/429 to a scripted request, and others serve a near-empty shell (elval.com
 * 961 bytes, notosgalleries.gr 88 bytes) with the real page rendered client-side.
 * Google has already crawled these sites, so its favicon cache reaches what we
 * cannot.
 *
 * Quality varies wildly and the service always answers 200 — a miss comes back as
 * a 16×16 globe rather than an error — so the ONLY reliable test is measuring the
 * bytes. Anything under MIN_FAVICON_PX is discarded.
 */
async function planCFavicon(site) {
  const seed = SEED_BRANDS.find((s) => s.id === site.id);
  const host = site.domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=256`;

  let res;
  try {
    res = await get(url, false);
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const dim = measure(res.buf);
  if (Math.max(dim.w, dim.h) < MIN_FAVICON_PX) return null;

  const ext = extFor(dim.kind);
  const file = `${site.id}.${ext}`;
  await writeFile(join(RAW_DIR, file), res.buf);

  return {
    id: site.id,
    brand: seed?.brand ?? site.id,
    sector: seed?.sector ?? "",
    accept: seed?.accept ?? [],
    note: seed?.note ?? "",
    source: "favicon",
    site: site.domain,
    status: "ok",
    file,
    ext,
    bytes: res.buf.length,
    heavy: res.buf.length > SIZE_WARN_BYTES,
    width: dim.w || undefined,
    height: dim.h || undefined,
    aspect: dim.w && dim.h ? +(dim.w / dim.h).toFixed(2) : undefined,
    pickedBy: "google-favicon",
    sourceUrl: url,
    descriptionUrl: `https://${host}`,
    license: "© the company — no stated license",
    restrictions: "trademarked",
    credit: `${host} via Google favicon cache (retrieved ${new Date().toISOString().slice(0, 10)})`,
  };
}

async function main() {
  const onlyArg = process.argv.indexOf("--only");
  const only =
    onlyArg !== -1 && process.argv[onlyArg + 1]
      ? new Set(process.argv[onlyArg + 1].split(","))
      : null;
  const targets = only ? OFFICIAL_SITES.filter((s) => only.has(s.id)) : OFFICIAL_SITES;

  await mkdir(RAW_DIR, { recursive: true });
  console.log(`Plan B — scraping ${targets.length} official sites\n`);

  const results = [];
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const done = await Promise.all(
      batch.map(async (site) => {
        const viaSite = await processSite(site);
        if (viaSite.status === "ok") return viaSite;
        // Plan B failed (blocked, or a JS shell with no logo in the HTML) — fall
        // back to Google's cache before giving up on the brand.
        const viaFavicon = await planCFavicon(site);
        return viaFavicon ?? viaSite;
      }),
    );
    for (const r of done) {
      const flag = { ok: "✓", "not-found": "?", error: "✗" }[r.status];
      const detail =
        r.status === "ok"
          ? `${String(r.bytes).padStart(7)} B  ${(r.width && r.height ? `${r.width}×${r.height}` : "").padEnd(11)}` +
            `${r.ext.padEnd(4)} via ${r.pickedBy}`
          : r.reason;
      console.log(`  ${flag} ${r.id.padEnd(20)} ${detail}`);
      results.push(r);
    }
    if (i + CONCURRENCY < targets.length) await sleep(250);
  }

  let previous = [];
  try {
    previous = JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    // Commons pass hasn't run — fine, this becomes the whole manifest.
  }
  const byId = new Map(previous.map((r) => [r.id, r]));
  for (const r of results) {
    // Never let a failed scrape overwrite a good Commons row.
    const existing = byId.get(r.id);
    if (existing?.status === "ok" && r.status !== "ok") continue;
    byId.set(r.id, r);
  }
  const merged = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(MANIFEST, `${JSON.stringify(merged, null, 2)}\n`);

  const gained = results.filter((r) => r.status === "ok").length;
  const okTotal = merged.filter((r) => r.status === "ok").length;
  console.log(
    `\nPlan B recovered ${gained}/${targets.length} · manifest now ${okTotal}/${merged.length} with an asset`,
  );
  console.log("Next: node scripts/preview-logopaignio.mjs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
