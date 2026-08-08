// Λογοπαίγνιο logo fetcher — PLAN D: Wikipedia article images.
//
// WHY THIS EXISTS, given we already query Commons.
//
// The Commons pass (Plan A) searches by TEXT RELEVANCE, which has no notion of
// which entity you mean. That is how the first run produced ΔΕΗ → "Namibia Power
// Corporation", Κρι Κρι → an Indonesian hospital, ΣΤΑΣΥ → a Lithuanian choir, and
// — the one that slipped past the guard entirely — Pizza Fan → Pizza Hut's logo,
// because "pizza" is a real token in both names.
//
// This pass resolves ENTITY-FIRST instead: find the brand's Wikipedia article,
// then take the image its infobox declares. An article is a specific company, so
// its logo cannot drift to a different one. The failure mode inverts usefully —
// Plan A returns the wrong logo confidently; Plan D returns nothing when it
// cannot find the article, which is a far cheaper failure for the operator.
//
// Greek Wikipedia is tried FIRST for Greek brands: el.wikipedia has articles for
// the local companies en.wikipedia lacks entirely.
//
// MEASURED RESULT (2026-07-28, first run over 36 brands): 25 "hits", of which
// only THREE were real — Αλλατίνη, FM Records, Notos Galleries. The other 22 were
// wrong, and the pattern is worth stating because it is not the Plan A failure:
//
//   Σκλαβενίτης Cash&Carry → Walmart          Κορφή    → a mountain-peak photo
//   Ιόλη   → the mythological figure          Καϊάφας  → a lake
//   Βενέτης→ a person named Βενέτης           Ήπειρος  → the geographic region
//   Pizza Fan → a photo of a pizza            Ήβη      → the goddess
//   Γρηγόρης → MIKEL's logo (a competitor)    Golden Star → BLUE STAR's logo
//
// The lesson: **Greek consumer brands are usually named after ordinary Greek
// words** — a peak, a lake, a goddess, a region. Entity-first resolution removes
// Plan A's cross-language drift but replaces it with word-collision: the article
// about the WORD outranks the article about the COMPANY, and a title-token check
// cannot tell them apart because the token genuinely matches.
//
// Two guards were added after that run: the article must look like a company
// (infobox/category evidence), and the image must look like a logo rather than a
// photograph. They cut the false-positive rate sharply but do NOT eliminate it —
// treat every Plan D row as suspect until seen. Photographs are the tell: a 4 MB
// 4320×3240 JPEG is a picture of something, never a mark.
//
// LEGAL: same posture as Plan A. A Wikipedia infobox logo is normally hosted on
// Commons (license recorded) or uploaded locally under fair use (no free license).
// The `license` field records which, so the ticket-04 note can stay honest.
//
// Run:  node scripts/fetch-logopaignio-wikipedia.mjs
//       node scripts/fetch-logopaignio-wikipedia.mjs --only mythos,venetis

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { SEED_BRANDS } from "./lib/logopaignio/seedBrands.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "..", "public", "logopaignio", "_raw");
const MANIFEST = join(RAW_DIR, "manifest.json");

const UA = "greek-bee-logopaignio-fetcher/2.0 (contact: melkorinos@gmail.com)";
const WIKIS = ["el", "en"]; // Greek first — it has the local brands en.wikipedia lacks.

const PAUSE_MS = 300;
const MIN_RASTER_PX = 64;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function politeFetch(url) {
  let wait = 800;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (res.status !== 429 && res.status !== 503) return res;
    const ra = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : wait);
    wait *= 2;
  }
  return fetch(url, { headers: { "User-Agent": UA } });
}

async function wikiApi(lang, params) {
  const url = `https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({
    ...params,
    format: "json",
    origin: "*",
  })}`;
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`${lang}.wikipedia HTTP ${res.status}`);
  return res.json();
}

/**
 * Does this article describe a COMPANY, rather than the ordinary word the company
 * is named after?
 *
 * This is the guard the first run lacked. A title-token check passes happily on
 * el:Κορφή for the brand Κορφή — the token matches because it is the same word.
 * What separates them is the article's own metadata: a company article carries
 * company categories and a company infobox; an article about a mountain does not.
 *
 * Checked against the article's categories and its rendered intro, in both
 * languages, since a Greek brand's article is usually Greek-only.
 */
async function looksLikeCompany(lang, title) {
  let json;
  try {
    json = await wikiApi(lang, {
      action: "query",
      titles: title,
      prop: "categories|extracts",
      cllimit: "60",
      exintro: "1",
      explaintext: "1",
    });
  } catch {
    return false;
  }
  const page = Object.values(json?.query?.pages ?? {})[0];
  if (!page) return false;

  const cats = (page.categories ?? []).map((c) => c.title.toLowerCase()).join(" ");
  const intro = String(page.extract ?? "").slice(0, 600).toLowerCase();
  const hay = `${cats} ${intro}`;

  // Positive evidence: the vocabulary of companies, in both languages.
  const COMPANY = [
    "εταιρεί", "εταιρί", "επιχείρησ", "βιομηχανί", "ζυθοποιί", "οινοποιεί",
    "γαλακτοβιομηχαν", "αλυσίδα", "σήμα", "εμπορικό", "ιδρύθηκε", "α.ε.",
    "company", "companies", "corporation", "brand", "brands", "manufacturer",
    "brewery", "breweries", "winery", "retail", "chain", "founded", "subsidiar",
    "supermarket", "record label", "s.a.",
  ];
  // Negative evidence: the article is about a place, a person, or a concept.
  const NOT_COMPANY = [
    "βουνό", "όρος", "κορυφή", "λίμνη", "ποταμ", "νησί", "χωριό", "δήμος",
    "οικισμ", "μυθολογί", "θεά", "θεός", "γεννήθηκε", "αθλητ", "τραγουδιστ",
    "ηθοποιό", "περιφέρεια", "νομός", "παραδοσιακό φαγητό",
    "mountain", "lake", "river", "island", "village", "municipalit",
    "mytholog", "goddess", "born", "footballer", "athlete", "singer", "actor",
    "region of", "geograph", "cuisine", "dish",
  ];

  const pos = COMPANY.some((t) => hay.includes(t));
  const neg = NOT_COMPANY.some((t) => hay.includes(t));
  return pos && !neg;
}

/**
 * Find the article title for a brand on one wiki.
 *
 * Two filters, both necessary: the title must contain a distinctive token from
 * the brand's identity (Plan A's guard, against unrelated articles), AND the
 * article must look like a company (against the word the brand is named after).
 */
async function findArticle(lang, seed) {
  const queries = [seed.brand, ...seed.accept.slice(0, 3)];

  /** Fold to comparable letters: case, accents and punctuation all removed. */
  const norm = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();

  // The brand's own names, normalised. The article title must BE one of these —
  // not merely contain a word from one.
  const identities = new Set([seed.brand, ...seed.accept].map(norm).filter(Boolean));

  const seen = new Set();
  for (const q of queries) {
    let json;
    try {
      json = await wikiApi(lang, { action: "query", list: "search", srsearch: q, srlimit: "6" });
    } catch {
      continue;
    }
    for (const h of json?.query?.search ?? []) {
      if (seen.has(h.title)) continue;
      seen.add(h.title);

      // Strip a disambiguator — el:"Μύθος (μπίρα)" must still match the brand Μύθος.
      const bare = norm(h.title.replace(/\s*\([^)]*\)\s*$/, ""));

      // TITLE-IDENTITY GUARD. A containment check let Wikipedia hand us a
      // SAME-INDUSTRY COMPETITOR whenever the brand had no article of its own:
      // Pizza Fan → Pizza Hut, Σκλαβενίτης → Walmart, Γρηγόρης → Mikel Coffee,
      // Golden Star Ferries → Blue Star Ferries. Every one of those is a real
      // company with a real logo, so the company-check above passes and the
      // photo-check passes — nothing downstream can catch it. Only the title can:
      // the article must be ABOUT this brand, so its name must match one the
      // brand actually goes by.
      const match =
        identities.has(bare) ||
        [...identities].some((id) => id.length >= 5 && (bare === id || bare.startsWith(`${id} `)));
      if (!match) continue;

      if (await looksLikeCompany(lang, h.title)) return h.title;
    }
  }
  return null;
}

/**
 * Pull the image an article's infobox declares (`pageimage`), plus its file page,
 * then resolve that file's real download URL and license.
 *
 * `pageprops.page_image_free` is preferred over `pageimage`: the former is
 * guaranteed to be a freely-licensed file, the latter can be a fair-use upload.
 */
async function articleImage(lang, title) {
  const json = await wikiApi(lang, {
    action: "query",
    titles: title,
    prop: "pageimages|pageprops",
    piprop: "original",
    pilicense: "any",
  });
  const page = Object.values(json?.query?.pages ?? {})[0];
  if (!page) return null;

  const fileName = page.pageprops?.page_image_free ?? page.pageimage;
  if (!fileName) return null;

  // Resolve the file through Commons first, then the local wiki (fair-use uploads
  // live only on the local wiki and are invisible to the Commons API).
  for (const host of ["commons.wikimedia.org", `${lang}.wikipedia.org`]) {
    const url = `https://${host}/w/api.php?${new URLSearchParams({
      action: "query",
      titles: `File:${fileName}`,
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      format: "json",
      origin: "*",
    })}`;
    let res;
    try {
      res = await politeFetch(url);
      if (!res.ok) continue;
    } catch {
      continue;
    }
    const j = await res.json();
    const p = Object.values(j?.query?.pages ?? {})[0];
    const info = p?.imageinfo?.[0];
    if (!info?.url) continue;

    const meta = info.extmetadata ?? {};
    const plain = (v) =>
      v?.value ? String(v.value).replace(/<[^>]*>/g, "").trim() : "";

    return {
      fileName,
      url: info.url,
      width: info.width,
      height: info.height,
      descriptionUrl: info.descriptionurl,
      license: plain(meta.LicenseShortName) || "no stated license (local upload)",
      restrictions: plain(meta.Restrictions),
      host,
    };
  }
  return null;
}

function inspectSvg(text) {
  return {
    paths: (text.match(/<path\b/g) ?? []).length,
    groups: (text.match(/<g\b/g) ?? []).length,
    embeddedRaster: (text.match(/<image\b/g) ?? []).length > 0,
    viewBox: text.match(/viewBox\s*=\s*"([^"]+)"/i)?.[1] ?? null,
  };
}

async function processOne(seed) {
  for (const lang of WIKIS) {
    let title;
    try {
      title = await findArticle(lang, seed);
    } catch {
      continue;
    }
    if (!title) continue;

    let img;
    try {
      img = await articleImage(lang, title);
    } catch {
      continue;
    }
    if (!img) continue;

    const ext = (img.url.split(".").pop() ?? "").toLowerCase().replace(/[^a-z]/g, "");
    if (!["svg", "png", "jpg", "jpeg", "webp"].includes(ext)) continue;

    // A tiny raster is a favicon-grade asset, not a logo we can blur in steps.
    if (ext !== "svg" && img.width && img.width < MIN_RASTER_PX) continue;

    // PHOTOGRAPH GUARD (part 1: dimensions, before spending the download).
    // Even a correct company article often illustrates itself with a photo — a
    // storefront, a factory, a bottle on a table (that is how the first run
    // "found" Μύθος). A mark is small and flat; a photo is large. Notos Galleries
    // is a legitimate 26 KB JPEG logo at 730×380, so the threshold sits well
    // above real logo sizes.
    if (ext !== "svg" && (img.width ?? 0) * (img.height ?? 0) > 1_500_000) continue;

    let res;
    try {
      res = await politeFetch(img.url);
      if (!res.ok) continue;
    } catch {
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) continue;

    // PHOTOGRAPH GUARD (part 2: weight). A logo that survives the dimension check
    // but still weighs half a megabyte is a compressed photograph — the game ships
    // these to clients, so it would fail the size budget anyway.
    if (ext !== "svg" && buf.length > 400_000) continue;

    const file = `${seed.id}.${ext}`;
    await writeFile(join(RAW_DIR, file), buf);

    return {
      id: seed.id,
      brand: seed.brand,
      sector: seed.sector,
      accept: seed.accept,
      note: seed.note ?? "",
      status: "ok",
      file,
      ext,
      bytes: buf.length,
      heavy: buf.length > 60_000,
      svg: ext === "svg" ? inspectSvg(buf.toString("utf8")) : null,
      source: "wikipedia",
      wikiLang: lang,
      wikiTitle: title,
      sourceUrl: img.url,
      descriptionUrl: img.descriptionUrl,
      license: img.license,
      restrictions: img.restrictions,
      credit: `${lang}.wikipedia.org «${title}» → ${img.fileName} (${img.license})`,
      pixels: img.width && img.height ? `${img.width}×${img.height}` : "",
    };
  }
  return null;
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
    // no manifest yet
  }
  const byId = new Map(manifest.map((r) => [r.id, r]));

  // Only chase brands that still lack an asset — this pass is a gap-filler, and
  // re-resolving a brand that already has a good file risks replacing it with a
  // worse one.
  const targets = SEED_BRANDS.filter((s) => {
    if (only) return only.has(s.id);
    return byId.get(s.id)?.status !== "ok";
  });

  console.log(`Plan D — Wikipedia articles for ${targets.length} brands without an asset\n`);

  let found = 0;
  for (const seed of targets) {
    const r = await processOne(seed);
    if (r) {
      byId.set(r.id, r);
      found += 1;
      console.log(
        `  ✓ ${r.id.padEnd(22)} ${String(r.bytes).padStart(8)} B  ${(r.pixels || "").padEnd(11)}${r.ext.padEnd(5)} ${r.wikiLang}:${r.wikiTitle}`,
      );
    } else {
      console.log(`  ? ${seed.id.padEnd(22)} no Wikipedia article image`);
    }
    await sleep(PAUSE_MS);
  }

  const merged = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(MANIFEST, `${JSON.stringify(merged, null, 2)}\n`);

  const withAsset = merged.filter((r) => r.status === "ok").length;
  console.log(
    `\nPlan D recovered ${found}/${targets.length} · manifest now ${withAsset}/${merged.length} with an asset`,
  );
  console.log("Next: node scripts/preview-logopaignio.mjs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
