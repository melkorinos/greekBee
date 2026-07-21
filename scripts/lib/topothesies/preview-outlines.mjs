// Dev-only: render every emitted Topothesies silhouette into one self-contained
// HTML page so the outline quality (simplification roughness) can be eyeballed.
// Output lands in the gitignored source/ dir. Run: node scripts/lib/topothesies/preview-outlines.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "..", "..", "src", "data", "topothesies");
const shapes = JSON.parse(readFileSync(join(dataDir, "shapes.json"), "utf8"));
const answers = JSON.parse(readFileSync(join(dataDir, "answers.json"), "utf8"));
const meta = new Map(answers.map((a) => [a.id, a]));

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

const cards = shapes
  .map((s) => {
    const m = meta.get(s.id) || {};
    const { viewBox, points } = analyze(s.path);
    const vb = s.viewBox || viewBox;
    const tag = m.isIsland ? `<span class="tag island">νησί</span>` : `<span class="tag">ηπειρωτική</span>`;
    return `<figure class="card" data-name="${(m.name || s.id).toLowerCase()} ${s.id}">
      <svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet">
        <path d="${s.path}" fill-rule="evenodd" vector-effect="non-scaling-stroke"/>
      </svg>
      <figcaption>
        <b>${m.name || s.id}</b> ${tag}
        <small>${s.id} · ${points} pts</small>
      </figcaption>
    </figure>`;
  })
  .join("\n");

const islands = shapes.filter((s) => (meta.get(s.id) || {}).isIsland).length;
const html = `<!doctype html><html lang="el"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Topothesies — outline preview (${shapes.length})</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; font: 14px system-ui, sans-serif; background: #f4f4f5; color: #18181b; }
  header { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #e4e4e7; padding: 12px 20px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; z-index: 1; }
  header h1 { font-size: 16px; margin: 0; }
  header .muted { color: #71717a; }
  input, button { font: inherit; padding: 6px 10px; border: 1px solid #d4d4d8; border-radius: 8px; background: #fff; }
  button { cursor: pointer; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; padding: 20px; }
  .card { margin: 0; background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 10px; }
  .card svg { width: 100%; height: 180px; display: block; }
  .card path { fill: #0ea5b7; stroke: #0b3b41; stroke-width: 1px; }
  body.outline .card path { fill: none; stroke: #dc2626; stroke-width: 1.2px; }
  figcaption { margin-top: 8px; display: flex; flex-direction: column; gap: 2px; }
  figcaption small { color: #71717a; }
  .tag { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: #e4e4e7; color: #3f3f46; }
  .tag.island { background: #cffafe; color: #155e63; }
  .hidden { display: none; }
</style></head><body>
<header>
  <h1>Topothesies outlines</h1>
  <span class="muted">${shapes.length} shapes · ${islands} islands · ${shapes.length - islands} mainland</span>
  <input id="q" type="search" placeholder="filter by name / id…">
  <button id="toggle">outline-only view</button>
  <span class="muted">tip: sort mentally by “pts” — low counts = coarse simplification</span>
</header>
<div class="grid">${cards}</div>
<script>
  document.getElementById("toggle").onclick = () => document.body.classList.toggle("outline");
  document.getElementById("q").oninput = (e) => {
    const v = e.target.value.trim().toLowerCase();
    for (const c of document.querySelectorAll(".card"))
      c.classList.toggle("hidden", v && !c.dataset.name.includes(v));
  };
</script></body></html>`;

const out = join(here, "source", "outlines-preview.html");
writeFileSync(out, html);
console.log("Wrote", out, `(${shapes.length} shapes, ${islands} islands)`);
