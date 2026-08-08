// registry.ts — the one place that knows which games have dictionary-derived
// premade data. apply-nominations.ts walks this list; adding a game means adding
// an adapter here, not touching the orchestrator.
//
// Partial entry — Vres Tin Frasi: its phrases (phrases-el.json) are authored
// content, not derived from words-el.json, so no Nomination can make them stale
// and no adapter covers them. Its guess-validation POOLS (words-2/3.json) are a
// different story — those are pure dictionary slices, and the vrestifrasi
// adapter owns them. The distinction is the decision; only the phrases are out.

import { writeFileSync } from "fs";

import { leksiarxeioAdapter } from "./leksiarxeio";
import { leksodromiaAdapter } from "./leksodromia";
import { leksokiposAdapter } from "./leksokipos";
import { leksoplegmaAdapter } from "./leksoplegma";
import { vrestifrasiAdapter } from "./vrestifrasi";
import type { DictionaryEdits, ResyncAdapter, ResyncReport } from "./types";

/**
 * A registered adapter with its `Content` type erased, so adapters over
 * different content shapes can share one list. The generic is captured at
 * register() time, which is what keeps load → resync → write type-safe inside.
 */
export interface RegisteredResync {
  id: string;
  /** load → resync → write-if-changed (never writes on a dry run). */
  apply(edits: DictionaryEdits, opts: { dryRun: boolean }): ResyncReport;
}

export function register<Content>(adapter: ResyncAdapter<Content>): RegisteredResync {
  return {
    id: adapter.id,
    apply(edits, { dryRun }) {
      const { content, report } = adapter.resync(adapter.load(), edits);
      // Writing lives here, not in the adapters: it is the same rule for every
      // game (never on a dry run, never when nothing changed), and keeping it
      // out of the adapters leaves them pure apart from load().
      if (!dryRun && report.changed.length > 0) {
        for (const file of adapter.files(content)) {
          writeFileSync(file.path, file.contents, "utf8");
        }
      }
      return report;
    },
  };
}

// Order matters for reading the output, not for correctness: every adapter
// derives from the same DictionaryEdits, never from another adapter's output.
export const RESYNC_REGISTRY: RegisteredResync[] = [
  register(leksiarxeioAdapter),
  register(vrestifrasiAdapter),
  register(leksokiposAdapter),
  register(leksoplegmaAdapter),
  register(leksodromiaAdapter),
];
