// supabaseMock.ts — the shared postgrest chain stub for API-route tests.
//
// Every route test mocks `@/lib/supabase` and hands the route a fake query
// builder. Before this helper, each test file defined its own `makeChain()`: the
// same dozen lines, with a slightly different verb list depending on which verbs
// that one route happened to call. Thirteen near-copies that drifted
// independently, and a fourteenth to write for every new route.
//
// The stub is deliberately dumb — it does not simulate a database. It replays a
// queued result per `from()` call, which is what a route test needs: the route's
// logic is the thing under test, not postgrest's. (The one test that *does* need
// a stateful fake, authLinkRoute, keeps its own — see the note at the bottom.)
//
// The chain is a thenable resolving to `result`, and every builder verb returns
// the chain, so it does not matter whether a route ends on `.single()`,
// `.limit()`, `.maybeSingle()` or awaits the builder directly — all four land on
// the same result.

/** What a postgrest call resolves to. Tests supply these via `enqueue`. */
export interface ChainResult {
  data?:  unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
}

/** Builder verbs the stub answers to. Add here, not in a per-file copy. */
const VERBS = [
  "select", "insert", "update", "upsert", "delete",
  "eq", "neq", "is", "in", "gt", "gte", "lt", "lte",
  "order", "limit", "range", "single", "maybeSingle",
] as const;

/** One recorded builder call, for tests that assert payloads or call order. */
export interface ChainCall {
  /** The name passed to `from()`. `""` when the chain was built directly. */
  table: string;
  /** The verb — "upsert", "eq", … */
  op:    string;
  args:  unknown[];
}

export interface ChainOptions {
  /** Called on every verb, before the chain is returned. */
  onCall?:    (call: ChainCall) => void;
  /**
   * Replaces a verb outright, for the few routes whose call shape the flat chain
   * cannot express — e.g. `upsert(...).select(...)` needing its own resolution.
   */
  overrides?: Record<string, (...args: unknown[]) => unknown>;
}

/**
 * Builds one query-builder stub that resolves to `result`.
 *
 * Usually reached through `makeQueuedClient` rather than called directly; call it
 * yourself only when a test needs one specific chain.
 */
export function makeChain(result: ChainResult, options: ChainOptions = {}, table = "") {
  const chain: Record<string, unknown> = {};

  for (const verb of VERBS) {
    const override = options.overrides?.[verb];
    chain[verb] = override
      ? (...args: unknown[]) => { options.onCall?.({ table, op: verb, args }); return override(...args); }
      : (...args: unknown[]) => { options.onCall?.({ table, op: verb, args }); return chain; };
  }

  chain.then = (resolve: (v: ChainResult) => void) => resolve(result);
  return chain;
}

/** The default when a test asks for more calls than it queued results for. */
const EMPTY: ChainResult = { data: null, error: null, count: null };

/**
 * A queue of results plus the fake client that serves them, one per `from()`.
 *
 * Wire it into the module mock and drive it from the test body:
 *
 *     const db = makeQueuedClient();
 *     vi.mock("@/lib/supabase", () => ({
 *       table: tableShim,
 *       getSupabaseClient: () => db.client,
 *     }));
 *     db.enqueue({ data: [row], error: null });
 */
export function makeQueuedClient(options: ChainOptions = {}) {
  const queue: ChainResult[] = [];

  return {
    /** Queue the results the next `from()` calls will resolve to, in order. */
    enqueue(...results: ChainResult[]) { queue.push(...results); },
    /** Drop anything left over — call from `beforeEach`. */
    reset() { queue.length = 0; },
    client: {
      from: (table: string) => makeChain(queue.shift() ?? EMPTY, options, table),
    },
  };
}

/**
 * The `table()` half of the module mock. Every route reaches postgrest through
 * `table(client, name)`, so the mock has to keep forwarding to the fake client's
 * `from()` — this is the one line that was repeated in 22 test files.
 */
export const tableShim = (client: { from: (n: string) => unknown }, name: string) => client.from(name);

// A note on what is NOT here: authLinkRoute.test.ts keeps a hand-written fake,
// because Sign-in Restore is the one route whose correctness depends on *which*
// rows come back for *which* identity — a queue that ignores the table name and
// the filters cannot express that. A stateful fake is the right tool there, and
// generalising this stub to cover it would make it worse for the other twelve.
