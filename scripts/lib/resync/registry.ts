// registry.ts — the one place that knows which games have dictionary-derived
// premade data. apply-nominations.ts walks this list; adding a game means adding
// an adapter here, not touching the orchestrator.
//
// Deliberate omission — Vres Tin Frasi: its premade data (phrases-el.json) is
// phrase content, not derived from words-el.json, so a Nomination can never make
// it stale. Its absence is a decision, not an oversight.

import { leksokiposAdapter } from "./leksokipos";
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
      if (!dryRun && report.changed.length > 0) {
        adapter.write(content);
      }
      return report;
    },
  };
}

export const RESYNC_REGISTRY: RegisteredResync[] = [register(leksokiposAdapter)];
