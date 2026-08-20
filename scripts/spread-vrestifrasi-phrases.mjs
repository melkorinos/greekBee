// Re-orders src/data/vrestifrasi/phrases-el.json so the daily rotation varies.
//
// Vres Tin Frasi serves phrase[dateToIndex(date)] — a plain sequential walk
// through the file, one entry per day. So file order IS the play order, and the
// file was authored in thematic blocks: 42 consecutive "X και Y" phrases sat at
// indices 106–147, i.e. six straight weeks of the same shape, plus runs of 13
// and 9 elsewhere. 101 of 411 phrases (25%) are joined by και/κι.
//
// This script rebuilds the order deterministically: the και/κι phrases are
// dealt out at a fixed stride so no two land near each other (the wrap from the
// last index back to index 0 included, because the rotation wraps), and both
// groups are shuffled with a fixed seed so the thematic blocks inside them break
// up too. Same input file, same output — re-run it after adding phrases.
//
//   node scripts/spread-vrestifrasi-phrases.mjs

import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../src/data/vrestifrasi/phrases-el.json", import.meta.url);
const SEED = 0x5f3a19c7; // fixed: the order must be reproducible, not fresh

/** Any phrase joined by και/κι — the shape that clustered. */
const isConjunctionPhrase = (phrase) => /(^|\s)(και|κι)(\s|$)/i.test(phrase);

/** mulberry32 — small seeded PRNG, so the shuffle is deterministic. */
function makeRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(items, random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const raw = JSON.parse(readFileSync(FILE, "utf8"));

// A phrase listed twice is served twice a year — the same variation problem in
// its smallest form. Drop the later copy before dealing.
const seen = new Set();
const entries = raw.filter((e) => !seen.has(e.phrase) && seen.add(e.phrase));
if (entries.length !== raw.length) {
  console.log(`dropped ${raw.length - entries.length} duplicate phrase(s)`);
}

const random = makeRandom(SEED);

const joined = shuffled(entries.filter((e) => isConjunctionPhrase(e.phrase)), random);
const rest = shuffled(entries.filter((e) => !isConjunctionPhrase(e.phrase)), random);

// Deal the και/κι phrases onto an even stride, fill the gaps with everything else.
const total = entries.length;
const stride = joined.length > 0 ? Math.floor(total / joined.length) : 0;
const out = new Array(total).fill(null);
joined.forEach((entry, i) => { out[i * stride] = entry; });
let next = 0;
for (let i = 0; i < total; i++) if (out[i] === null) out[i] = rest[next++];

if (out.some((e) => e === null) || next !== rest.length) {
  throw new Error("spread failed: not every slot filled exactly once");
}

writeFileSync(FILE, JSON.stringify(out) + "\n", "utf8");

const gap = stride - 1;
console.log(`${total} phrases, ${joined.length} joined by και/κι (${((100 * joined.length) / total).toFixed(1)}%)`);
console.log(`dealt every ${stride} days — at least ${gap} other phrases between any two`);
