// Unit tests for the re-sync registry's write gate.
//
// register() owns the one rule every adapter shares: persist the re-synced
// content ONLY when something actually changed, and NEVER on a dry run. That
// rule decides whether real data files get touched, so it is worth pinning down
// with a fake adapter rather than trusting a dry run to prove a negative.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFileSync } from "fs";

import { register } from "../../../scripts/lib/resync/registry";
import type { DictionaryEdits, ResyncAdapter, ResyncReport } from "../../../scripts/lib/resync/types";

// registry.ts binds `writeFileSync` at import time, so the module must be mocked
// rather than spied on — a spy would never be seen by the already-bound import.
// Partial mock: the real adapters this module pulls in still need readFileSync.
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  // The mocked writeFileSync must be on `default` too: these scripts compile as
  // CJS, so interop can resolve the named import through the default export.
  const mocked = { ...actual, writeFileSync: vi.fn() };
  return { ...mocked, default: mocked };
});

const write = vi.mocked(writeFileSync);

interface FakeContent {
  words: string[];
}

/** An adapter that reports a change only when `edits.added` is non-empty. */
const fakeAdapter = (
  report: ResyncReport = { changed: [{ id: "x", added: ["νεο"], removed: [] }], warnings: [] },
): ResyncAdapter<FakeContent> => ({
  id: "fake",
  load: () => ({ words: ["παλιο"] }),
  resync: (content: FakeContent, edits: DictionaryEdits) => ({
    content: { words: [...content.words, ...edits.added] },
    report: edits.added.length > 0 ? report : { changed: [], warnings: report.warnings },
  }),
  files: (content) => [{ path: "C:/nowhere/fake.json", contents: JSON.stringify(content.words) }],
});

const edits = (added: string[] = []): DictionaryEdits => ({ added, removed: [] });

beforeEach(() => write.mockReset());

describe("register — the write gate", () => {
  it("writes the re-synced content when something changed", () => {
    const game = register(fakeAdapter());

    game.apply(edits(["νεο"]), { dryRun: false });

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(
      "C:/nowhere/fake.json",
      JSON.stringify(["παλιο", "νεο"]), // post-resync content, not what load() returned
      "utf8",
    );
  });

  it("never writes on a dry run, even when something changed", () => {
    const game = register(fakeAdapter());

    const report = game.apply(edits(["νεο"]), { dryRun: true });

    expect(write).not.toHaveBeenCalled();
    // …but the preview still reports what a real run would do.
    expect(report.changed).toHaveLength(1);
  });

  it("does not write when nothing changed", () => {
    const game = register(fakeAdapter());

    const report = game.apply(edits(), { dryRun: false });

    expect(write).not.toHaveBeenCalled();
    expect(report.changed).toHaveLength(0);
  });

  it("writes every file an adapter emits", () => {
    const multi: ResyncAdapter<FakeContent> = {
      ...fakeAdapter(),
      files: (content) => [
        { path: "C:/nowhere/a.json", contents: JSON.stringify(content.words) },
        { path: "C:/nowhere/b.json", contents: "b" },
      ],
    };

    register(multi).apply(edits(["νεο"]), { dryRun: false });

    expect(write).toHaveBeenCalledTimes(2);
    expect(write.mock.calls.map((c) => c[0])).toEqual(["C:/nowhere/a.json", "C:/nowhere/b.json"]);
  });

  it("surfaces warnings even when nothing was auto-fixed", () => {
    const game = register(fakeAdapter({ changed: [], warnings: ["needs a human"] }));

    const report = game.apply(edits(), { dryRun: false });

    expect(write).not.toHaveBeenCalled();
    expect(report.warnings).toEqual(["needs a human"]);
  });

  it("exposes the adapter's id for reporting", () => {
    expect(register(fakeAdapter()).id).toBe("fake");
  });
});
