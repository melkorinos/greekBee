// Λογοπαίγνιο — renders the eye-check page from the fetch manifest.
//
//   node scripts/fetch-logopaignio-logos.mjs   (writes _raw/manifest.json)
//   node scripts/preview-logopaignio.mjs       (writes the preview HTML)
//
// The PoC preview was hand-written with each logo's SVG source pasted inline —
// fine for 5 brands, unmaintainable at 106. This generates the page from the
// manifest instead, so it can never drift from what was actually downloaded.
//
// The page is a WORKSHEET, not a decision: the agent can fetch, measure and flag,
// but "is this mark recognizable once the name is stripped?" is the operator's
// call. Every card therefore shows the evidence (full logo, byte size, license,
// path count, warnings) and states plainly what still needs a human.
//
// Output: .claude/aiHelper/logopaignio-preview.html (gitignored? no — it is a
// review artifact the operator opens directly; it stays small because assets are
// referenced by relative path, not inlined).

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_DIR = join(ROOT, "public", "logopaignio", "_raw");
const MANIFEST = join(RAW_DIR, "manifest.json");
const OUT = join(ROOT, ".claude", "aiHelper", "logopaignio-preview.html");

/**
 * Sectors the operator has parked. Their cards still render (the assets are
 * fetched and worth keeping) but are banner-marked so the eye check skips them.
 *
 * Εστίαση was un-deferred on 2026-07-27 (expansion #2): the operator added the
 * coffee and fast-food chains and wants them reviewed with everything else. The
 * mechanism stays — it costs nothing and the next parked sector will want it.
 */
const DEFERRED_SECTORS = new Set([]);

/** Budget per shipped mark. Anything above reads as HEAVY in the preview. */
const SIZE_WARN_BYTES = 60_000;
/** Above this it is a hard problem, not a nit — the game ships marks to clients. */
const SIZE_FAIL_BYTES = 200_000;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtBytes = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)} KB` : `${n} B`);

/** Warnings that need the operator's attention, worst first. */
function warningsFor(r) {
  const out = [];
  if (r.weakMatch) {
    out.push({
      level: "bad",
      text: `Πιθανώς ΛΑΘΟΣ εταιρεία — ο τίτλος «${r.commonsTitle}» δεν αναφέρει τη μάρκα.`,
    });
  }
  if (r.duplicateOf?.length) {
    out.push({
      level: "bad",
      text: `Ίδιο αρχείο με: ${r.duplicateOf.join(", ")} — τουλάχιστον ένα είναι λάθος.`,
    });
  }
  // Judged against this file's own thresholds, not the manifest's `heavy` flag —
  // otherwise the preview would silently inherit whatever budget the fetcher ran with.
  if (r.bytes > SIZE_FAIL_BYTES) {
    out.push({ level: "bad", text: `Πολύ βαρύ (${fmtBytes(r.bytes)}) — χρειάζεται αντικατάσταση.` });
  } else if (r.bytes > SIZE_WARN_BYTES) {
    out.push({ level: "warn", text: `Βαρύ (${fmtBytes(r.bytes)}) — χρειάζεται συμπίεση.` });
  }
  // Every raster format needs a manual crop — only an SVG can be cut by clipping
  // its viewBox. WebP joined the list on 2026-07-28 when the fetcher learned to
  // accept it; leaving it out would have shown those cards as falsely "clean".
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(r.ext)) {
    out.push({
      level: "warn",
      text: `${r.ext.toUpperCase()} — δεν κόβεται με clip του viewBox· χρειάζεται χειροκίνητο crop.`,
    });
  }
  if (r.svg?.embeddedRaster) {
    out.push({ level: "warn", text: "Το SVG περιέχει ενσωματωμένη εικόνα (όχι καθαρά vector)." });
  }
  if (r.svg && r.svg.paths <= 1 && !r.svg.embeddedRaster) {
    out.push({
      level: "warn",
      text: "Ένα μόνο path — πιθανώς «flattened»· το σύμβολο δεν απομονώνεται με clip.",
    });
  }
  // An archived snapshot can be older than the brand's current logo, which is a
  // direct conflict with the "current logo only" rule. Defunct brands are the
  // exception — for them an old mark is the point.
  if (r.source === "wayback") {
    out.push({
      level: "warn",
      text: `Από αρχειοθετημένο στιγμιότυπο (${r.snapshotDate ?? "άγνωστη ημερομηνία"}) — επιβεβαίωσε ότι είναι το ΤΡΕΧΟΝ λογότυπο.`,
    });
  }
  // Plan D resolves by article, which collides with brands named after ordinary
  // Greek words (Κορφή the peak, Ιόλη the person). The guards catch most of it,
  // but the operator should still confirm the subject.
  if (r.source === "wikipedia") {
    out.push({
      level: "warn",
      text: `Από Wikipedia («${r.wikiTitle ?? "?"}») — επιβεβαίωσε ότι το άρθρο αφορά την ΕΤΑΙΡΕΙΑ.`,
    });
  }
  if (/wordmark/i.test(r.commonsTitle ?? "")) {
    out.push({
      level: "warn",
      text: "Ο τίτλος λέει «wordmark» — πιθανώς μόνο το όνομα, χωρίς σύμβολο (ΑΠΟΡΡΙΨΗ).",
    });
  }
  return out;
}

function card(r, assetHref) {
  const warns = warningsFor(r);
  const worst = warns.some((w) => w.level === "bad")
    ? "bad"
    : warns.length
      ? "warn"
      : "clean";

  const media =
    r.status === "ok"
      ? `<img src="${esc(assetHref)}" alt="${esc(r.brand)}" loading="lazy">`
      : `<div class="missing">${
          r.status === "manual"
            ? `<b>ΘΕΛΕΙ ΕΙΚΟΝΑ ΑΠΟ ΕΣΕΝΑ</b><br><small>ονόμασέ την <code>${esc(r.id)}.png</code> (ή .svg)</small>`
            : r.status === "not-found"
              ? "δεν βρέθηκε αυτόματα"
              : "σφάλμα λήψης"
        }</div>`;

  const statusTag =
    { ok: "βρέθηκε", "not-found": "δεν βρέθηκε", manual: "χειροκίνητα", error: "σφάλμα" }[
      r.status
    ] ?? r.status;

  return `
  <figure class="card ${worst}" data-status="${esc(r.status)}" data-sector="${esc(r.sector)}"
          data-flag="${warns.length ? worst : "clean"}" id="${esc(r.id)}">
    <div class="media">${media}</div>
    <figcaption>
      <div class="row1">
        <b>${esc(r.brand)}</b>
        <span class="tag sector">${esc(r.sector)}</span>
        <span class="tag st-${esc(r.status)}">${esc(statusTag)}</span>
        ${r.status === "ok" ? `<span class="tag size">${esc(fmtBytes(r.bytes))}</span>` : ""}
        ${r.status === "ok" ? `<span class="tag fmt">${esc(r.ext.toUpperCase())}</span>` : ""}
      </div>
      ${
        warns.length
          ? `<ul class="warns">${warns
              .map((w) => `<li class="${w.level}">${esc(w.text)}</li>`)
              .join("")}</ul>`
          : ""
      }
      <div class="accept">${r.accept.map((a) => `<code>${esc(a)}</code>`).join("")}</div>
      ${r.note ? `<small class="note">${esc(r.note)}</small>` : ""}
      ${
        r.status === "ok"
          ? `<small class="src">${esc(r.license ?? "")}${
              r.restrictions ? ` · ${esc(r.restrictions)}` : ""
            } · <a href="${esc(r.descriptionUrl ?? "#")}" target="_blank" rel="noreferrer">${esc(
              r.commonsTitle,
            )}</a></small>`
          : `<small class="src">${esc(r.reason ?? "")}</small>`
      }
    </figcaption>
  </figure>`;
}

async function main() {
  const rows = JSON.parse(await readFile(MANIFEST, "utf8"));

  const ok = rows.filter((r) => r.status === "ok");
  const flagged = ok.filter((r) => warningsFor(r).length > 0);
  const clean = ok.length - flagged.length;
  const missing = rows.filter((r) => r.status !== "ok");

  // Assets are referenced relatively so the page stays a few KB regardless of pool size.
  const assetDir = relative(dirname(OUT), RAW_DIR).replace(/\\/g, "/");

  // Sector order follows the seed list's own grouping so the review reads sanely.
  const sectors = [...new Set(rows.map((r) => r.sector))];
  const bySector = sectors.map((s) => ({ sector: s, items: rows.filter((r) => r.sector === s) }));

  const html = `<!doctype html><html lang="el"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Λογοπαίγνιο — έλεγχος υποψηφίων (${rows.length})</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px system-ui, sans-serif; background: #f4f4f5; color: #18181b; }
  header { position: sticky; top: 0; z-index: 5; background: #fff; border-bottom: 1px solid #e4e4e7;
           padding: 12px 20px; display: flex; gap: 14px; align-items: baseline; flex-wrap: wrap; }
  header h1 { font-size: 16px; margin: 0; }
  header .muted { color: #71717a; font-size: 13px; }
  .filters { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
  .filters button { font: inherit; font-size: 12px; padding: 4px 10px; border-radius: 999px;
                    border: 1px solid #d4d4d8; background: #fff; cursor: pointer; }
  .filters button.on { background: #18181b; color: #fff; border-color: #18181b; }
  .legend { padding: 14px 20px 0; color: #52525b; max-width: 940px; line-height: 1.6; }
  .legend b { color: #18181b; }
  .legend ul { margin: 8px 0 0; padding-left: 20px; }
  h2 { margin: 26px 20px 0; font-size: 13px; text-transform: uppercase; letter-spacing: .06em;
       color: #71717a; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px; }
  h2.deferred { color: #92500c; border-bottom-color: #f0d8a6; }
  h2 .todo { text-transform: none; letter-spacing: 0; font-weight: 600; color: #92500c;
             background: #fef3c7; border-radius: 999px; padding: 2px 10px; margin-left: 8px; }
  h2.deferred + .grid { opacity: .55; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
          gap: 14px; padding: 14px 20px; }
  .card { margin: 0; background: #fff; border: 1px solid #e4e4e7; border-radius: 12px;
          padding: 12px; display: flex; flex-direction: column; }
  .card.warn { border-color: #f0d8a6; background: #fffdf7; }
  .card.bad  { border-color: #f3bcbc; background: #fff8f8; }
  .card.hidden { display: none; }
  .media { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 10px;
           height: 110px; display: flex; align-items: center; justify-content: center; }
  .media img { max-width: 100%; max-height: 88px; display: block; }
  .missing { color: #a1a1aa; text-align: center; font-size: 12px; line-height: 1.5; }
  figcaption { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
  .row1 { display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
  .row1 b { font-size: 15px; }
  .tag { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: #e4e4e7; color: #3f3f46; }
  .tag.st-ok { background: #dcfce7; color: #15803d; }
  .tag.st-not-found { background: #f4f4f5; color: #71717a; }
  .tag.st-manual { background: #ede9fe; color: #6d28d9; }
  .card[data-status="manual"] { border-color: #c4b5fd; background: #faf8ff; }
  .card[data-status="manual"] .missing b { color: #6d28d9; font-size: 12px; letter-spacing: .02em; }
  .card[data-status="manual"] .missing code { background: #ede9fe; border-radius: 4px; padding: 0 4px; }
  .tag.st-error { background: #fee2e2; color: #b91c1c; }
  .warns { margin: 0; padding-left: 16px; font-size: 12px; line-height: 1.5; }
  .warns .bad { color: #b91c1c; }
  .warns .warn { color: #92500c; }
  .accept { font-size: 12px; }
  .accept code { background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 4px;
                 padding: 0 5px; margin: 0 3px 3px 0; display: inline-block; }
  .note { color: #52525b; }
  .src { color: #a1a1aa; font-size: 11px; word-break: break-word; }
  .src a { color: #71717a; }
</style></head><body>
<header>
  <h1>Λογοπαίγνιο — έλεγχος υποψηφίων</h1>
  <span class="muted">${rows.length} μάρκες · ${ok.length} με αρχείο (${clean} καθαρά, ${flagged.length} με σημείωση) · ${missing.length} χωρίς αρχείο</span>
  <div class="filters">
    <button data-filter="all" class="on">Όλα</button>
    <button data-filter="clean">Καθαρά</button>
    <button data-filter="warn">Με προειδοποίηση</button>
    <button data-filter="bad">Προβληματικά</button>
    <button data-filter="missing">Χωρίς αρχείο</button>
    <button data-filter="manual">Θέλουν εικόνα από εσένα</button>
  </div>
</header>
<div class="legend">
  Κάθε κάρτα δείχνει το <b>πλήρες λογότυπο όπως κατέβηκε</b> — <b>όχι</b> το τελικό «mark-only» crop.
  Το crop είναι το επόμενο βήμα και γίνεται μόνο για όσες μάρκες εγκρίνεις.
  <ul>
    <li><b>Η κρίση είναι δική σου:</b> το script βρίσκει και μετράει, αλλά δεν αποφασίζει.
        Για κάθε κάρτα: αναγνωρίζεται η μάρκα <i>χωρίς</i> το όνομά της; Αν το λογότυπο είναι
        μόνο κείμενο, <b>απορρίπτεται</b> (icon-only filter).</li>
    <li><b>Κόκκινες κάρτες</b> = πιθανώς λάθος εταιρεία ή διπλό/υπερβολικά βαρύ αρχείο.</li>
    <li><b>Κίτρινες κάρτες</b> = χρειάζονται δουλειά (PNG, flattened path, βάρος, «wordmark»).</li>
    <li>Τα αρχεία είναι στο <code>public/logopaignio/_raw/</code> (gitignored staging).</li>
  </ul>
</div>
${bySector
  .map(
    ({ sector, items }) => `<h2${DEFERRED_SECTORS.has(sector) ? ' class="deferred"' : ""}>${esc(sector)} <span style="text-transform:none;color:#a1a1aa">· ${items.length}</span>${
      DEFERRED_SECTORS.has(sector)
        ? ' <span class="todo">TODO — αναβλήθηκε για επόμενη συνεδρία, μην ελέγχεις τώρα</span>'
        : ""
    }</h2>
<div class="grid">${items.map((r) => card(r, `${assetDir}/${r.file ?? ""}`)).join("")}</div>`,
  )
  .join("\n")}
<script>
  const buttons = document.querySelectorAll('.filters button');
  const cards = document.querySelectorAll('.card');
  buttons.forEach((b) => b.addEventListener('click', () => {
    buttons.forEach((x) => x.classList.toggle('on', x === b));
    const f = b.dataset.filter;
    cards.forEach((c) => {
      const status = c.dataset.status;
      const flag = c.dataset.flag;
      const show =
        f === 'all' ? true :
        f === 'manual' ? status === 'manual' :
        f === 'missing' ? status !== 'ok' :
        status === 'ok' && flag === f;
      c.classList.toggle('hidden', !show);
    });
    document.querySelectorAll('h2').forEach((h) => {
      const grid = h.nextElementSibling;
      const any = [...grid.children].some((c) => !c.classList.contains('hidden'));
      h.style.display = any ? '' : 'none';
      grid.style.display = any ? '' : 'none';
    });
  }));
</script>
</body></html>
`;

  await writeFile(OUT, html);
  console.log(`Preview → ${OUT}`);
  console.log(
    `${rows.length} cards · ${clean} clean · ${flagged.length} flagged · ${missing.length} without an asset`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
