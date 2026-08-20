// Final spec sheet for the four chosen Λεξόκηπος button icons.
// Chosen: Διαγραφή 2 (backspace με βέλος), Καθαρισμός 2 (Χ σε κύκλο),
//         Καταχώρηση 1 (τσεκ), Ανακάτεμα 12 (δύο μισά τόξα).
const fs = require('fs');
const f = n => String(Math.round(n * 100) / 100);
const R = d => d * Math.PI / 180;
const P = (cx, cy, r, a) => [cx + r * Math.cos(R(a)), cy + r * Math.sin(R(a))];

const circ = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
function arc(cx, cy, r, a0, a1) {
  const [x0, y0] = P(cx, cy, r, a0), [x1, y1] = P(cx, cy, r, a1);
  const la = Math.abs(a1 - a0) > 180 ? 1 : 0, sw = a1 > a0 ? 1 : 0;
  return `M${f(x0)} ${f(y0)}A${f(r)} ${f(r)} 0 ${la} ${sw} ${f(x1)} ${f(y1)}`;
}
function head(x, y, dx, dy, size) {
  const L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, px = -uy, py = ux;
  return `M${f(x - ux * size + px * size * .72)} ${f(y - uy * size + py * size * .72)}` +
    `L${f(x)} ${f(y)}L${f(x - ux * size - px * size * .72)} ${f(y - uy * size - py * size * .72)}`;
}
const S = (d, w = 2.2) =>
  `<path fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`;

const TAG = 'M9.6 4.9H19.4A2.2 2.2 0 0 1 21.6 7.1V16.9A2.2 2.2 0 0 1 19.4 19.1H9.6L2.9 12Z';

const ICONS = {
  del: { name: 'Διαγραφή', from: 'ιδέα 2 — Backspace με βέλος',
    art: S(TAG) + S('M18.4 12H12.6M15 9.6L12.6 12L15 14.4') },
  clear: { name: 'Καθαρισμός', from: 'ιδέα 2 — Χ σε κύκλο',
    art: S(circ(12, 12, 8.8)) + S('M8.8 8.8L15.2 15.2M15.2 8.8L8.8 15.2') },
  shuffle: { name: 'Ανακάτεμα', from: 'ιδέα 12 — Δύο μισά τόξα',
    art: S(arc(12, 12, 8, -150, -30) + head(...P(12, 12, 8, -30), 0.5, 0.87, 3.2)) +
         S(arc(12, 12, 8, 30, 150) + head(...P(12, 12, 8, 150), -0.5, -0.87, 3.2)) },
  submit: { name: 'Καταχώρηση', from: 'ιδέα 1 — Τσεκ',
    art: S('M4.6 12.6L9.8 17.8L19.4 6.8', 2.4) },
};

let defs = '';
for (const [k, v] of Object.entries(ICONS))
  defs += `<symbol id="i-${k}" viewBox="0 0 24 24" fill="currentColor">${v.art}</symbol>`;

const ic = (k, px = 22) => `<svg width="${px}" height="${px}" aria-hidden="true"><use href="#i-${k}"/></svg>`;
const btn = (k, cls = '') => `<span class="sq ${cls}">${ic(k)}</span>`;

/** The three button rows, rendered on a light or a dark board. */
function board(theme) {
  const w = (ch, cls = '') => `<span class="w ${cls}">${ch}</span>`;
  return `<div class="board ${theme}">

    <div class="cap">Η σειρά κουμπιών — τέσσερα ίδια squircle, μόνο εικονίδια</div>
    <div class="row">${btn('del')}${btn('clear')}${btn('shuffle')}${btn('submit', 'go')}</div>

    <div class="cap">Δίπλα στα γράμματα — 4 γράμματα, ενεργή</div>
    <div class="row word">${w('Κ')}${w('Α', 'ctr')}${w('Λ')}${w('Ο')}${btn('submit', 'go')}</div>

    <div class="cap">Δίπλα στα γράμματα — 3 γράμματα, ανενεργή</div>
    <div class="row word">${w('Κ')}${w('Α', 'ctr')}${w('Λ')}${btn('submit', 'no')}</div>

    <div class="cap">Η σειρά με ανενεργή Καταχώρηση</div>
    <div class="row">${btn('del')}${btn('clear')}${btn('shuffle')}${btn('submit', 'no')}</div>
  </div>`;
}

const marks = Object.entries(ICONS).map(([k, v]) => `<div class="mark">
  <div class="pair">${btn(k)}<span class="sq dk">${ic(k)}</span></div>
  <b>${v.name}</b><p>${v.from}</p></div>`).join('');

const html = `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Λεξόκηπος — τα τέσσερα εικονίδια</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 12.5px/1.5 system-ui, sans-serif; margin: 0; padding: 20px;
         background: #f4f4f5; color: #18181b; }
  h1 { font-size: 19px; margin: 0 0 4px; }
  .lede { color: #52525b; margin: 0 0 18px; max-width: 78ch; }
  h2 { font-size: 14px; margin: 26px 0 8px; }
  .marks { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
  .mark { background: #fff; border: 1px solid #e4e4e7; border-radius: 10px; padding: 11px 12px; }
  .mark b { display: block; margin-top: 9px; font-size: 12.5px; }
  .mark p { margin: 1px 0 0; color: #71717a; font-size: 11px; }
  .pair { display: flex; gap: 8px; }

  /* ── The squircle. 44×34 with elliptical corners, so it reads as a stretched
       key rather than a pill. The 1px border is the same border-border token the
       page separator and the header circles already use — nothing new. ── */
  .sq { display: inline-flex; align-items: center; justify-content: center; flex: none;
        width: 44px; height: 34px; border-radius: 16px / 13px;
        border: 1px solid #e7e5e4; background: transparent; color: #1c1917; }
  .sq svg { display: block; }
  .sq.dk { border-color: #44403c; background: #1c1917; color: #f5f5f4; }
  .sq.go { background: #16a34a; border-color: #16a34a; color: #fff; }
  .sq.no { background: #f5f5f4; border-color: #e7e5e4; color: #a8a29e; }

  .board { border-radius: 12px; padding: 14px 16px 16px; margin-bottom: 12px; }
  .board.light { background: #faf9f7; color: #1c1917; border: 1px solid #e4e4e7; }
  .board.dark  { background: #1c1917; color: #f5f5f4; border: 1px solid #3f3f46; }
  .board.dark .sq { border-color: #44403c; color: #f5f5f4; }
  .board.dark .sq.go { background: #16a34a; border-color: #16a34a; color: #fff; }
  .board.dark .sq.no { background: #292524; border-color: #44403c; color: #78716c; }
  .cap { font-size: 10px; text-transform: uppercase; letter-spacing: .05em;
         opacity: .55; margin: 14px 0 6px; }
  .cap:first-child { margin-top: 0; }
  .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .row.word { gap: 4px; }
  .row.word .sq { margin-left: 10px; }
  .w { font-size: 26px; font-weight: 700; letter-spacing: .06em; }
  .w.ctr { color: #ca8a04; }
  .board.dark .w.ctr { color: #facc15; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  table { border-collapse: collapse; width: 100%; max-width: 640px; background: #fff;
          border: 1px solid #e4e4e7; border-radius: 10px; overflow: hidden; }
  th, td { text-align: left; padding: 7px 11px; border-bottom: 1px solid #f4f4f5; font-size: 12px; }
  th { width: 190px; font-weight: 600; color: #52525b; }
  tr:last-child td, tr:last-child th { border-bottom: 0; }
  code { font-family: ui-monospace, monospace; font-size: 11.5px; }
  @media (max-width: 760px) {
    body { padding: 13px; }
    .two { grid-template-columns: 1fr; }
    .marks { grid-template-columns: 1fr 1fr; }
    th { width: auto; }
  }
  @media (prefers-color-scheme: dark) {
    body { background: #18181b; color: #f4f4f5; }
    .lede { color: #a1a1aa; }
    .mark, table { background: #27272a; border-color: #3f3f46; }
    .mark p, th { color: #a1a1aa; }
    td, th { border-bottom-color: #3f3f46; }
  }
</style>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">${defs}</svg>

<h1>Λεξόκηπος — τα τέσσερα εικονίδια</h1>
<p class="lede">Τελικά σχέδια, όπως τα διάλεξες. Όλα μέσα στο ίδιο τεντωμένο squircle 44×34,
με το ίδιο περίγραμμα 1 px που έχουν ήδη ο διαχωριστής της σελίδας και τα στρογγυλά κουμπιά της
κεφαλίδας. Η Καταχώρηση εμφανίζεται δύο φορές — δίπλα στα γράμματα και στη σειρά με τα άλλα τρία —
και είναι πράσινη όταν η λέξη έχει 4+ γράμματα, γκρίζα και ανενεργή από κάτω.</p>

<div class="marks">${marks}</div>

<h2>Στην οθόνη</h2>
<div class="two">${board('light')}${board('dark')}</div>

<h2>Προδιαγραφή</h2>
<table>
  <tr><th>Κουτί κουμπιού</th><td>44 × 34 px</td></tr>
  <tr><th>Γωνία</th><td><code>border-radius: 16px / 13px</code> — ελλειπτική, γι’ αυτό δείχνει τεντωμένη</td></tr>
  <tr><th>Περίγραμμα</th><td>1 px <code>border-border</code> — το ίδιο που ήδη υπάρχει, κανένα νέο χρώμα</td></tr>
  <tr><th>Εικονίδιο</th><td>22 px σε καμβά 24×24, γραμμή 2,2 (το τσεκ 2,4), <code>currentColor</code></td></tr>
  <tr><th>Καταχώρηση ενεργή</th><td>γέμισμα <code>bg-correct</code>, εικονίδιο λευκό, από 4 γράμματα και πάνω</td></tr>
  <tr><th>Καταχώρηση ανενεργή</th><td><code>bg-surface-raised</code> + <code>text-muted</code>, ορατή αλλά ανενεργή</td></tr>
</table>
`;
fs.writeFileSync(process.argv[2], html);
console.log('ok', html.length);
