// Λογοπαίγνιο logo fetcher — walks the full seed list (scripts/lib/logopaignio/seedBrands.mjs).
//
// For each candidate brand it asks the Wikimedia Commons API to RESOLVE an asset
// (search → imageinfo), then downloads it into public/logopaignio/_raw/ and records
// the license + byte size + trademark restriction. `_raw/` is gitignored staging:
// these are the FULL logos, usually with the wordmark still attached.
//
// It writes a machine-readable manifest to _raw/manifest.json, which the preview
// generator (scripts/preview-logopaignio.mjs) renders for the human eye check.
// Nothing here decides anything — every row is a candidate until the operator
// approves it and it is written into src/data/logopaignio/puzzles-el.json.
//
// The PoC's hand-written `markStatus` guesses were REMOVED on purpose (2026-07-27):
// they were wrong on 3 of 5 brands (Alpha Bank and Aegean were tagged "likely
// REJECT" yet both were kept; Cosmote was tagged fine yet was dropped). A guess
// that contradicts the operator's verdict is worse than no guess — the icon-only
// call is made by eye, from the preview, not by this script. What the script
// reports instead is MEASURED: how many separable path groups the SVG has, which
// is evidence for the crop, not a verdict on the brand.
//
// Run:  node scripts/fetch-logopaignio-logos.mjs
//       node scripts/fetch-logopaignio-logos.mjs --only alpha-bank,skroutz
//
// Politeness: Commons asks for a real User-Agent and no hammering. Requests run
// in small batches with a pause between them.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { SEED_BRANDS } from "./lib/logopaignio/seedBrands.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "..", "public", "logopaignio", "_raw");
const MANIFEST = join(RAW_DIR, "manifest.json");

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "greek-bee-logopaignio-fetcher/2.0 (contact: melkorinos@gmail.com)";

// Politeness budget. The first full run (2026-07-27) used 4-wide batches and got
// HTTP 429 from upload.wikimedia.org on 38 of 106 downloads — the API search calls
// were fine, it was the binary downloads that tripped the limit. Downloads are now
// SERIAL with a pause, and a 429 is retried with exponential backoff rather than
// recorded as a failure.
const BATCH_SIZE = 2;
const BATCH_PAUSE_MS = 400;
const MAX_RETRIES = 4;

/** Anything larger is flagged in the preview — the game ships these to the client. */
const SIZE_WARN_BYTES = 60_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch() that backs off on rate limiting instead of failing.
 * Wikimedia answers 429 when we pull binaries too fast and often sends a
 * Retry-After; we honour it, else double the wait each attempt.
 */
async function politeFetch(url) {
  let wait = 800;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status !== 429 && res.status !== 503) return res;
    if (attempt === MAX_RETRIES) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : wait);
    wait *= 2;
  }
  throw new Error("unreachable");
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ ...params, format: "json", origin: "*" })}`;
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`Commons API HTTP ${res.status}`);
  return res.json();
}

/**
 * Strip "File:"/extension and fold to comparable lowercase letters.
 * Greek and Latin are both kept — a Greek-titled file is a good sign, not noise.
 */
function titleWords(title) {
  return title
    .replace(/^File:/i, "")
    .replace(/\.(svg|png)$/i, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * Words that carry no brand identity — they appear in half of Commons and in our
 * own search terms, so matching on them proves nothing. "logo" is the worst
 * offender: every file we consider is titled "<something> logo", so including it
 * made the check pass unconditionally.
 */
const STOPWORDS = new Set([
  "logo",
  "logos",
  "emblem",
  "symbol",
  "wordmark",
  "icon",
  "greece",
  "greek",
  "hellas",
  "hellenic",
  "group",
  "company",
  "corporation",
  "power",
  "bank",
  "energy",
  "airlines",
  "ferries",
  "lines",
  "cinemas",
  "coffee",
  "supermarket",
  "cropped",
  "new",
  "the",
  "and",
]);

/**
 * Does a Commons file title plausibly belong to THIS brand?
 *
 * The blind "first search hit" heuristic returned confident nonsense on the first
 * full run — ΔΕΗ matched "Namibia Power Corporation", Κρι Κρι matched an Indonesian
 * hospital ("KRI dr. Radjiman"), ΣΤΑΣΥ matched a Lithuanian choir competition
 * ("Stasio Šimkaus"). Commons search ranks by text relevance and has no idea which
 * country we mean, so one shared token is enough to win.
 *
 * The check: at least one DISTINCTIVE token from the brand's own identity (its
 * display name or accept-list — never the search terms, which we wrote ourselves
 * and which contain the generic words that caused the false matches) must appear
 * in the file title. This cannot prove a match is right — that is still the
 * operator's eye check — but it catches the ones that are provably about
 * something else.
 */
function titleMatchesBrand(title, seed) {
  const words = new Set(titleWords(title));
  // Identity only: brand + accept-list. Search terms are excluded on purpose.
  for (const cand of [seed.brand, ...seed.accept]) {
    for (const token of titleWords(cand)) {
      // Short tokens ("ab", "3e", "box") collide too easily to be evidence.
      if (token.length < 4) continue;
      if (STOPWORDS.has(token)) continue;
      if (words.has(token)) return true;
    }
  }
  return false;
}

/**
 * Find the best candidate FILE on Commons for one brand.
 * Tries each search term in order; prefers SVG (the only format we can crop by
 * clipping the viewBox), and requires the title to actually mention the brand.
 * @returns {Promise<{title: string, weak: boolean}|null>}
 */
async function resolveFileTitle(seed) {
  /** @type {string|null} */
  let weakFallback = null;

  for (const term of seed.search) {
    const json = await api({
      action: "query",
      list: "search",
      srsearch: term,
      srnamespace: "6", // File:
      srlimit: "12",
    });
    const hits = json?.query?.search ?? [];
    const usable = hits
      .map((h) => h.title)
      .filter((t) => /\.(svg|png)$/i.test(t))
      .filter((t) => /logo|emblem|symbol|wordmark|icon/i.test(t));
    if (usable.length === 0) continue;

    const onBrand = usable.filter((t) => titleMatchesBrand(t, seed));
    if (onBrand.length > 0) {
      return { title: onBrand.find((t) => /\.svg$/i.test(t)) ?? onBrand[0], weak: false };
    }
    // Remember the best off-brand hit, but keep trying the other search terms.
    weakFallback ??= usable.find((t) => /\.svg$/i.test(t)) ?? usable[0];
  }

  // Nothing named for the brand. Return the off-brand hit FLAGGED so the preview
  // shows it as suspect rather than silently presenting it as this brand's logo.
  return weakFallback ? { title: weakFallback, weak: true } : null;
}

/** Pull the download URL + license metadata for a resolved file title. */
async function fileInfo(title) {
  const json = await api({
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
  });
  const page = Object.values(json?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const plain = (v) =>
    v?.value
      ? String(v.value)
          .replace(/<[^>]*>/g, "")
          .trim()
      : "";
  return {
    url: info.url,
    descriptionUrl: info.descriptionurl,
    license: plain(meta.LicenseShortName) || "unknown",
    artist: plain(meta.Artist),
    restrictions: plain(meta.Restrictions),
  };
}

/**
 * Count separable top-level drawable groups in an SVG.
 * This is EVIDENCE for the crop step, not a verdict: a logo whose symbol and
 * wordmark are separate <path>s at separate x-ranges can be cropped by clipping
 * the viewBox alone (the PoC's key finding). One single path usually means the
 * logo is flattened and needs a manual crop.
 */
function inspectSvg(text) {
  const paths = (text.match(/<path\b/g) ?? []).length;
  const groups = (text.match(/<g\b/g) ?? []).length;
  const images = (text.match(/<image\b/g) ?? []).length;
  const viewBox = text.match(/viewBox\s*=\s*"([^"]+)"/i)?.[1] ?? null;
  return { paths, groups, embeddedRaster: images > 0, viewBox };
}

async function processOne(seed) {
  const base = {
    id: seed.id,
    brand: seed.brand,
    sector: seed.sector,
    accept: seed.accept,
    note: seed.note ?? "",
  };

  if (!seed.search) {
    return { ...base, status: "manual", reason: "no expected public asset — source by hand" };
  }

  try {
    const resolved = await resolveFileTitle(seed);
    if (!resolved) {
      return { ...base, status: "not-found", reason: `no Commons file for: ${seed.search.join(" / ")}` };
    }
    const { title, weak } = resolved;

    const info = await fileInfo(title);
    if (!info?.url) {
      return { ...base, status: "not-found", reason: `no imageinfo for ${title}` };
    }

    const res = await politeFetch(info.url);
    if (!res.ok) {
      return { ...base, status: "error", reason: `download HTTP ${res.status}` };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = /\.svg$/i.test(info.url) ? "svg" : info.url.split(".").pop().toLowerCase();
    const file = `${seed.id}.${ext}`;
    await writeFile(join(RAW_DIR, file), buf);

    const svg = ext === "svg" ? inspectSvg(buf.toString("utf8")) : null;

    return {
      ...base,
      status: "ok",
      file,
      ext,
      bytes: buf.length,
      heavy: buf.length > SIZE_WARN_BYTES,
      /** No accept-list token appears in the file title — probably a different entity. */
      weakMatch: weak,
      svg,
      commonsTitle: title,
      sourceUrl: info.url,
      descriptionUrl: info.descriptionUrl,
      license: info.license,
      restrictions: info.restrictions,
      credit: `Wikimedia Commons, ${title} (${info.license}${info.restrictions ? `, ${info.restrictions}` : ""})`,
    };
  } catch (err) {
    return { ...base, status: "error", reason: err.message };
  }
}

async function main() {
  const onlyArg = process.argv.indexOf("--only");
  const only =
    onlyArg !== -1 && process.argv[onlyArg + 1]
      ? new Set(process.argv[onlyArg + 1].split(","))
      : null;

  const targets = only ? SEED_BRANDS.filter((s) => only.has(s.id)) : SEED_BRANDS;

  await mkdir(RAW_DIR, { recursive: true });
  console.log(`Resolving ${targets.length} candidate brands via Commons → ${RAW_DIR}\n`);

  /** @type {any[]} */
  const results = [];
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const done = await Promise.all(batch.map(processOne));
    for (const r of done) {
      const flag = { ok: "✓", manual: "○", "not-found": "?", error: "✗" }[r.status];
      const detail =
        r.status === "ok"
          ? `${String(r.bytes).padStart(7)} B  ${r.heavy ? "HEAVY " : "      "}` +
            `${r.weakMatch ? "SUSPECT " : ""}${r.commonsTitle}`
          : r.reason;
      console.log(`  ${flag} ${r.id.padEnd(22)} ${detail}`);
      results.push(r);
    }
    if (i + BATCH_SIZE < targets.length) await sleep(BATCH_PAUSE_MS);
  }

  // Merge into any existing manifest so --only runs don't wipe earlier results.
  let previous = [];
  try {
    previous = JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    // no manifest yet — first full run
  }
  const byId = new Map(previous.map((r) => [r.id, r]));
  for (const r of results) byId.set(r.id, r);
  const merged = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

  // Two brands resolving to the SAME Commons file means at least one is wrong
  // (the first run pointed both Nova and Forthnet at File:NOVA Greece logo.svg).
  // Only Commons rows have a commonsTitle; Plan B/C rows (official sites, favicon
  // cache) have none, so they must be skipped — grouping them by `undefined`
  // would report every single one as a duplicate of all the others.
  const titleOwners = new Map();
  for (const r of merged) {
    if (r.status !== "ok" || !r.commonsTitle) continue;
    const list = titleOwners.get(r.commonsTitle) ?? [];
    list.push(r.id);
    titleOwners.set(r.commonsTitle, list);
  }
  for (const r of merged) {
    if (r.status !== "ok") continue;
    const owners = r.commonsTitle ? (titleOwners.get(r.commonsTitle) ?? []) : [];
    r.duplicateOf = owners.length > 1 ? owners.filter((id) => id !== r.id) : undefined;
  }

  await writeFile(MANIFEST, `${JSON.stringify(merged, null, 2)}\n`);

  const tally = merged.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  const heavy = merged.filter((r) => r.heavy).length;
  const suspect = merged.filter((r) => r.weakMatch).length;
  const dupes = merged.filter((r) => r.duplicateOf).length;
  console.log(
    `\n${merged.length} rows in manifest · ` +
      Object.entries(tally)
        .map(([k, v]) => `${v} ${k}`)
        .join(" · ") +
      (heavy ? ` · ${heavy} over ${SIZE_WARN_BYTES / 1000} KB` : "") +
      (suspect ? ` · ${suspect} suspect` : "") +
      (dupes ? ` · ${dupes} duplicate` : ""),
  );
  console.log(`\nManifest → ${MANIFEST}`);
  console.log("Next: node scripts/preview-logopaignio.mjs   (renders the eye-check page)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
