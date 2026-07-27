// Logopaignio logo fetcher (PoC — first 5 brands).
//
// Downloads RAW brand logos into public/logopaignio/_raw/. These are the full
// logos (usually WITH the wordmark). The mark-stripping crop is a manual step:
// inspect each raw file, crop the symbol out, and save the final mark to
// public/logopaignio/<id>.svg (or .png). Brands whose logo is wordmark-only
// (no separable symbol) should be REJECTED — they fail the icon-only filter.
//
// Run:  node scripts/fetch-logopaignio-logos.mjs
//
// Sources are Wikimedia Commons "Original file" URLs. All five carry a
// {{PD-textlogo}}/{{trademarked}} status (ineligible for copyright, trademark
// noted) — recorded per-row in `credit` for takedown readiness.

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "..", "public", "logopaignio", "_raw");

/**
 * @typedef {Object} RawSource
 * @property {string} id       stable puzzle id (also the raw filename stem)
 * @property {string} brand    display name
 * @property {string} sector
 * @property {string|null} url direct download URL, or null = source manually
 * @property {"has-symbol"|"wordmark-only"} markStatus  crop guidance
 * @property {string} credit   source + license, for the puzzle row
 */

/** @type {RawSource[]} */
const SOURCES = [
  {
    id: "alpha-bank",
    brand: "Alpha Bank",
    sector: "banking",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/35/Alpha_Bank_logo.svg",
    markStatus: "wordmark-only", // likely REJECT — no separable symbol
    credit: "Wikimedia Commons, File:Alpha Bank logo.svg (PD-textlogo, trademarked)",
  },
  {
    id: "cosmote",
    brand: "Cosmote (OTE)",
    sector: "telecom",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/35/Cosmote_Telekom_Logo.svg",
    markStatus: "has-symbol", // gradient mark present — crop it
    credit: "Wikimedia Commons, File:Cosmote Telekom Logo.svg (PD-textlogo, trademarked)",
  },
  {
    id: "aegean",
    brand: "Aegean Airlines",
    sector: "airline",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Aegean_Airlines_Logo_2020.svg",
    markStatus: "wordmark-only", // check the raw — tail/bird mark may need a richer source
    credit: "Wikimedia Commons, File:Aegean Airlines Logo 2020.svg (PD-textlogo, trademarked)",
  },
  {
    id: "helleniq-energy",
    brand: "HelleniQ Energy",
    sector: "energy",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f9/HelleniQ_Energy_logo.svg",
    markStatus: "has-symbol", // heptagon symbol — clean crop candidate
    credit: "Wikimedia Commons, File:HelleniQ Energy logo.svg (PD-textlogo, trademarked)",
  },
  {
    id: "public",
    brand: "Public",
    sector: "retail",
    url: null, // no clean Wikimedia SVG — grab from public.gr brand assets manually
    markStatus: "has-symbol",
    credit: "TODO — source from public.gr official brand asset; record license",
  },
];

async function fetchOne(src) {
  if (!src.url) {
    return { id: src.id, status: "manual", note: src.credit };
  }
  const ext = src.url.endsWith(".svg") ? "svg" : src.url.split(".").pop();
  const dest = join(RAW_DIR, `${src.id}.${ext}`);
  const res = await fetch(src.url, {
    headers: { "User-Agent": "greek-bee-logopaignio-fetcher/1.0 (contact: melkorinos@gmail.com)" },
  });
  if (!res.ok) {
    return { id: src.id, status: "error", note: `HTTP ${res.status}` };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return { id: src.id, status: "ok", note: `${buf.length} bytes → ${dest}` };
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  console.log(`Fetching ${SOURCES.length} raw logos into ${RAW_DIR}\n`);

  const results = await Promise.all(SOURCES.map(fetchOne));

  for (const r of results) {
    const flag = { ok: "✓", manual: "○", error: "✗" }[r.status];
    console.log(`  ${flag} ${r.id.padEnd(18)} ${r.note}`);
  }

  console.log("\nNext steps (manual):");
  for (const s of SOURCES) {
    const hint =
      s.markStatus === "wordmark-only"
        ? "wordmark-only → likely REJECT or find a symbol source"
        : "has symbol → crop the mark out of the wordmark";
    console.log(`  • ${s.brand.padEnd(20)} ${hint}`);
  }
  console.log(
    "\nCrop each keeper into public/logopaignio/<id>.svg, then add its row to puzzles-el.json.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
