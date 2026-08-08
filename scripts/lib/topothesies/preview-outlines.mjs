// Dev-only: render the whole «Νομοί & Νησιά» answer list into one self-contained
// HTML page — every silhouette (so outline quality can be eyeballed) plus, for
// each unit, its capital and a live / deferred / placeholder status.
//
// Data source = preview-cards.json, produced by the preview build of the pipeline
// (it includes the deferred islands the live game excludes, plus can't-peel
// placeholder cards). Regenerate both with:
//     TOPO_PREVIEW=1 npx tsx scripts/generateTopothesies.ts
//     node scripts/lib/topothesies/preview-outlines.mjs
// Output lands in .claude/aiHelper/outlines-preview.html (a tracked-in-place dev
// reference, not gitignored source).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const cards = JSON.parse(readFileSync(join(here, "source", "preview-cards.json"), "utf8"));

/** Fallback viewBox + vertex count straight from the path numbers. */
function analyze(path) {
  const nums = (path.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    const x = nums[i], y = nums[i + 1];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const w = maxX - minX, h = maxY - minY;
  const pad = Math.max(w, h) * 0.04 || 1;
  return { viewBox: `${minX - pad} ${minY - pad} ${w + 2 * pad} ${h + 2 * pad}`, points: nums.length / 2 };
}

const STATUS_LABEL = { live: "LIVE", deferred: "DEFERRED", placeholder: "BACKLOG" };

const html_cards = cards
  .map((c) => {
    const tag = c.isIsland ? `<span class="tag island">νησί</span>` : `<span class="tag">ηπειρωτική</span>`;
    const statusTag = `<span class="tag st-${c.status}">${STATUS_LABEL[c.status] || c.status}</span>`;
    const filter = `${(c.name || c.id).toLowerCase()} ${c.id} ${(c.capital || "").toLowerCase()} ${c.status}`;
    let svg;
    let pts;
    if (c.path) {
      const a = analyze(c.path);
      const vb = c.viewBox || a.viewBox;
      pts = a.points;
      svg = `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet">
        <path d="${c.path}" fill-rule="evenodd" vector-effect="non-scaling-stroke"/>
      </svg>`;
    } else {
      pts = "—";
      svg = `<div class="placeholder">χωρίς σχήμα<br><small>needs polygon-split</small></div>`;
    }
    return `<figure class="card st-card-${c.status}" data-name="${filter}">
      ${svg}
      <figcaption>
        <b>${c.name || c.id}</b> ${tag} ${statusTag}
        <small>πρωτεύουσα: ${c.capital || "—"}</small>
        <small class="muted">${c.id} · ${pts} pts</small>
      </figcaption>
    </figure>`;
  })
  .join("\n");

const count = (s) => cards.filter((c) => c.status === s).length;
const islands = cards.filter((c) => c.isIsland).length;
const html = `<!doctype html><html lang="el"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Topothesies — Νομοί & Νησιά (${cards.length})</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; font: 14px system-ui, sans-serif; background: #f4f4f5; color: #18181b; }
  header { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #e4e4e7; padding: 12px 20px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; z-index: 1; }
  header h1 { font-size: 16px; margin: 0; }
  header .muted { color: #71717a; }
  input, button { font: inherit; padding: 6px 10px; border: 1px solid #d4d4d8; border-radius: 8px; background: #fff; }
  button { cursor: pointer; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; padding: 20px; }
  .card { margin: 0; background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 10px; }
  .card.st-card-deferred { border-color: #f0d8a6; background: #fffdf7; }
  .card.st-card-placeholder { border-color: #d3c8f2; background: #faf9ff; }
  .card svg { width: 100%; height: 180px; display: block; }
  .card path { fill: #0ea5b7; stroke: #0b3b41; stroke-width: 1px; }
  .st-card-deferred path { fill: #f59e0b; stroke: #92500c; }
  body.outline .card path { fill: none; stroke: #dc2626; stroke-width: 1.2px; }
  .placeholder { height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #8b7fc0; border: 1.5px dashed #c9bef0; border-radius: 8px; }
  figcaption { margin-top: 8px; display: flex; flex-direction: column; gap: 2px; }
  figcaption small { color: #52525b; }
  figcaption small.muted { color: #a1a1aa; }
  .tag { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: #e4e4e7; color: #3f3f46; }
  .tag.island { background: #cffafe; color: #155e63; }
  .tag.st-live { background: #dcfce7; color: #15803d; }
  .tag.st-deferred { background: #fef3c7; color: #92500c; }
  .tag.st-placeholder { background: #ede9fe; color: #6d28d9; }
  .hidden { display: none; }
</style></head><body>
<header>
  <h1>Νομοί & Νησιά</h1>
  <span class="muted">${cards.length} μονάδες · ${count("live")} live · ${count("deferred")} deferred · ${count("placeholder")} backlog · ${islands} νησιά</span>
  <input id="q" type="search" placeholder="filter: όνομα / id / πρωτεύουσα / status…">
  <button data-f="deferred">only deferred</button>
  <button data-f="placeholder">only backlog</button>
  <button data-f="">all</button>
  <button id="toggle">outline-only</button>
</header>
<div class="grid">${html_cards}</div>
<script>
  const q = document.getElementById("q");
  const apply = (v) => {
    v = v.trim().toLowerCase();
    for (const c of document.querySelectorAll(".card"))
      c.classList.toggle("hidden", v && !c.dataset.name.includes(v));
  };
  document.getElementById("toggle").onclick = () => document.body.classList.toggle("outline");
  q.oninput = (e) => apply(e.target.value);
  for (const b of document.querySelectorAll("button[data-f]"))
    b.onclick = () => { q.value = b.dataset.f; apply(b.dataset.f); };
</script></body></html>`;

const out = join(here, "..", "..", "..", ".claude", "aiHelper", "outlines-preview.html");
writeFileSync(out, html);
console.log("Wrote", out, `(${cards.length} cards: ${count("live")} live, ${count("deferred")} deferred, ${count("placeholder")} backlog)`);
