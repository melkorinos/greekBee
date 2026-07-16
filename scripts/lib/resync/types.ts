// types.ts — the re-sync registry contract.
//
// Background: several games ship pre-built data that is *derived from*
// words-el.json. When an accepted Leksikastirio Nomination edits the dictionary,
// that derived data goes stale unless it is re-synced in the same breath. Each
// affected game implements one adapter over this contract; apply-nominations.ts
// is a thin orchestrator that walks the registry.
//
// The split matters: `resync` is PURE (content in, content out) so it can be
// unit-tested and re-run over committed data by the drift guard, while `load`
// and `write` are the only I/O and stay trivial.

/** Dictionary edits, already normalised, as applied to words-el.json. */
export interface DictionaryEdits {
  added: string[];
  removed: string[];
}

/** One unit of derived data that changed (a puzzle, a word list, an entry). */
export interface ResyncChange {
  id?: string;
  added: string[];
  removed: string[];
}

export interface ResyncReport {
  changed: ResyncChange[];
  /**
   * Things the re-sync CANNOT auto-fix and a human must action — e.g. a removed
   * word that is baked into a Leksoplegma puzzle's grid geometry. Never used for
   * changes the adapter already made.
   */
  warnings: string[];
}

/** One file's exact on-disk bytes. */
export interface ResyncFile {
  path: string;
  contents: string;
}

export interface ResyncAdapter<Content> {
  /** Matches a RegistryGameId — see src/config/games.ts. */
  id: string;
  /** Read this game's derived data file(s) from disk. The only read I/O. */
  load(): Content;
  /** Pure: apply the edits, report what changed and what needs a human. */
  resync(content: Content, edits: DictionaryEdits): { content: Content; report: ResyncReport };
  /**
   * Pure: exactly the files — and exactly the bytes — that persisting this
   * content writes. Serialisation must match each game's generator byte for
   * byte, or re-running the generator produces a spurious whole-file diff.
   *
   * Kept separate from the writing itself so the byte format is testable with
   * no I/O at all: premadeDataConsistency.test.ts asserts that
   * files(load()) reproduces what is on disk. The registry does the writing.
   */
  files(content: Content): ResyncFile[];
}
