// supabase.ts — singleton Supabase client for browser usage.
//
// Uses the anon (public) key. Row Level Security on each table controls
// what the anon role is allowed to do — currently insert-only on nominations.
//
// Environment variables (set in .env.local for local dev; Vercel dashboard for prod):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

import { createClient } from "@supabase/supabase-js";

// Typed schema — extend this as new tables are added.
//
// ⚠️ STALE — DO NOT TRUST. Nothing type-checks against this interface (the client
// is created without the Database generic, and every query goes through table()),
// so it has silently drifted from the real schema. Verified against the live DB
// on 2026-07-16: `player_achievements`, `player_pangrams` and `identity_audit`
// are missing entirely; `game_scores` is missing `is_perfect`; the community_*
// tables say status is "accepted" where the code writes "approved". It is kept
// only because WordSuggestion*/NominationVoteInsert below are derived from it.
//
// Do NOT hand-patch it — regenerate from the DB instead. See
// .claude/handoffs/supabase-typed-client-handoff.md.
export interface Database {
  public: {
    Tables: {
      game_scores: {
        Row: {
          id:           number;
          game_id:      string;
          puzzle_date:  string;
          device_id:    string;
          display_name: string;
          score:        number;
          data:         Record<string, unknown>;
        };
        Insert: {
          id?:           number;
          game_id:       string;
          puzzle_date:   string;
          device_id:     string;
          display_name?: string;
          score:         number;
          data?:         Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["game_scores"]["Insert"]>;
      };
      nominations: {
        Row: {
          id:           string;
          word:         string;
          player_name:  string | null;
          note:         string | null;
          device_id:    string;
          direction:    "add" | "remove";
          status:       "pending" | "accepted" | "rejected";
          created_at:   string;
          reviewed_at:  string | null;
        };
        Insert: {
          id?:           string;
          word:          string;
          player_name?:  string | null;
          note?:         string | null;
          device_id:     string;
          direction?:    "add" | "remove";
          status?:       "pending" | "accepted" | "rejected";
          created_at?:   string;
          reviewed_at?:  string | null;
        };
        Update: Partial<Database["public"]["Tables"]["nominations"]["Insert"]>;
      };
      nomination_votes: {
        Row: {
          id:            string;
          nomination_id: string;
          device_id:     string;
          created_at:    string;
          vote_type:     "up" | "down";
        };
        Insert: {
          id?:            string;
          nomination_id:  string;
          device_id:      string;
          created_at?:    string;
          vote_type?:     "up" | "down";
        };
        Update: Partial<Database["public"]["Tables"]["nomination_votes"]["Insert"]>;
      };
      player_profiles: {
        Row: {
          id:           number;
          display_name: string;
          device_uuid:  string;
          created_at:   string;
          last_active:  string;
          auth_user_id: string | null;
        };
        Insert: {
          id?:           number;
          display_name:  string;
          device_uuid:   string;
          created_at?:   string;
          last_active?:  string;
          auth_user_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["player_profiles"]["Insert"]>;
      };
      game_state: {
        Row: {
          id:          number;
          device_uuid: string;
          game_id:     string;
          puzzle_date: string;
          state:       Record<string, unknown>;
          updated_at:  string;
        };
        Insert: {
          id?:          number;
          device_uuid:  string;
          game_id:      string;
          puzzle_date:  string;
          state?:       Record<string, unknown>;
          updated_at?:  string;
        };
        Update: Partial<Database["public"]["Tables"]["game_state"]["Insert"]>;
      };
      transfer_codes: {
        Row: {
          code:        string;
          device_uuid: string;
          created_at:  string;
          expires_at:  string;
          used:        boolean;
        };
        Insert: {
          code:         string;
          device_uuid:  string;
          created_at?:  string;
          expires_at?:  string;
          used?:        boolean;
        };
        Update: Partial<Database["public"]["Tables"]["transfer_codes"]["Insert"]>;
      };
      community_leksiarxeio_puzzles: {
        Row: {
          id:             number;
          submitter_name: string;
          data:           Record<string, unknown>;
          status:         "pending" | "accepted" | "rejected";
          created_at:     string;
        };
        Insert: {
          id?:             number;
          submitter_name?: string;
          data:            Record<string, unknown>;
          status?:         "pending" | "accepted" | "rejected";
          created_at?:     string;
        };
        Update: Partial<Database["public"]["Tables"]["community_leksiarxeio_puzzles"]["Insert"]>;
      };
      community_leksindeseis_puzzles: {
        Row: {
          id:             number;
          submitter_name: string;
          data:           Record<string, unknown>;
          status:         "pending" | "accepted" | "rejected";
          created_at:     string;
        };
        Insert: {
          id?:             number;
          submitter_name?: string;
          data:            Record<string, unknown>;
          status?:         "pending" | "accepted" | "rejected";
          created_at?:     string;
        };
        Update: Partial<Database["public"]["Tables"]["community_leksindeseis_puzzles"]["Insert"]>;
      };
      community_vrestifrasi_puzzles: {
        Row: {
          id:             number;
          submitter_name: string;
          data:           Record<string, unknown>;
          status:         "pending" | "accepted" | "rejected";
          created_at:     string;
        };
        Insert: {
          id?:             number;
          submitter_name?: string;
          data:            Record<string, unknown>;
          status?:         "pending" | "accepted" | "rejected";
          created_at?:     string;
        };
        Update: Partial<Database["public"]["Tables"]["community_vrestifrasi_puzzles"]["Insert"]>;
      };
      community_stavrolekso_puzzles: {
        Row: {
          id:             number;
          title:          string | null;
          submitter_name: string;
          edit_pin:       string;
          data:           Record<string, unknown>;
          status:         "pending" | "accepted" | "rejected";
          created_at:     string;
        };
        Insert: {
          id?:             number;
          title?:          string | null;
          submitter_name?: string;
          edit_pin:        string;
          data:            Record<string, unknown>;
          status?:         "pending" | "accepted" | "rejected";
          created_at?:     string;
        };
        Update: Partial<Database["public"]["Tables"]["community_stavrolekso_puzzles"]["Insert"]>;
      };
    };
  };
}

export type WordSuggestionInsert =
  Database["public"]["Tables"]["nominations"]["Insert"];

export type WordSuggestionRow =
  Database["public"]["Tables"]["nominations"]["Row"];

export type NominationVoteInsert =
  Database["public"]["Tables"]["nomination_votes"]["Insert"];

/** The Supabase client shape returned by every getter in this module. */
export type SupabaseClient = ReturnType<typeof createClient>;

// ── The table accessor ────────────────────────────────────────────────────────
//
// This module owns the untyped-client cast exactly once, so no call site needs
// `(supabase.from(x) as any)` plus a paired eslint-disable.
//
// Why the cast is needed at all: the client is created without the Database
// generic (see below), so supabase-js resolves every table's Insert/Update
// payload type to `never` — any write fails to compile. Reads type-check without
// a cast, but they route through table() too, so that giving the client real
// types later is a change to this file alone rather than to ~20 call sites.
//
// The `any` is deliberate and is the point of the seam: it is a single, named,
// documented hole rather than ~60 anonymous ones.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = any;

/**
 * Any Supabase client. Typed structurally rather than as `SupabaseClient` so
 * that table() also accepts clients built with an explicit schema generic —
 * the live-DB tests construct their own with the anon and service-role keys.
 */
type FromCapable = { from: (relation: string) => unknown };

/**
 * Returns a query builder for `name` on `client`, with the untyped-client cast
 * applied. Pass the client explicitly — the anon singleton, a token-scoped
 * client, and the service-role client are all valid callers and the choice is
 * security-relevant, so it stays visible at the call site.
 */
export function table(client: FromCapable, name: string): QueryBuilder {
  return client.from(name);
}

// Untyped client — tables are typed at the call site via WordSuggestionInsert.
// Using the Database generic on createClient requires matching supabase-js
// internal GenericSchema exactly, which is brittle across minor versions.
let _client: SupabaseClient | null = null;

/**
 * Returns the singleton Supabase client.
 * Safe to call in browser or API-route code; will throw at runtime (not build
 * time) if the env vars are missing — which surfaces the misconfiguration clearly.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  // PKCE flow: signInWithOAuth returns to /auth/callback with ?code=, which the
  // callback page exchanges manually via exchangeCodeForSession. The library
  // default is the implicit flow (tokens in the URL hash) — that mismatches the
  // callback and leaves it with no ?code= ("Λείπει ο κωδικός επιβεβαίωσης").
  // detectSessionInUrl is off so the callback is the SOLE code-exchanger;
  // otherwise the client auto-exchanges on load and the single-use code is spent
  // before the manual call runs.
  _client = createClient(url, key, {
    auth: { flowType: "pkce", detectSessionInUrl: false },
  });
  return _client;
}

/**
 * Returns a Supabase client that carries the caller's access token, so RLS sees
 * them as the authenticated user (auth.uid() resolves to their id). Used by server
 * routes that must write a row guarded by an `auth.uid()` policy on behalf of the
 * signed-in caller — the least-privilege alternative to the service-role client:
 * RLS stays authoritative, so the caller can only touch rows the policy allows.
 * Not a singleton — a fresh client per token.
 */
export function getTokenScopedClient(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createClient(url, key, {
    auth:   { persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Returns a service-role Supabase client that bypasses Row Level Security.
 * SERVER-ONLY — never import into browser code. Reads SUPABASE_SERVICE_ROLE_KEY,
 * which is not a NEXT_PUBLIC_ var and so is never shipped to the client.
 * Throws at runtime (not build time) when the env vars are missing.
 */
export function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Auth helpers (browser-only) ──────────────────────────────────────────────

/** Initiates Google OAuth. Saves the current path so the callback can redirect back. */
export async function signInWithGoogle(): Promise<void> {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("auth-redirect", window.location.pathname);
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
    },
  });
  // Client-side-detectable failures (network, malformed config) come back here
  // rather than throwing. Surface them so callers can tell the user instead of
  // leaving a dead button. Note: a disabled provider is NOT caught here — that
  // 400 is returned by Supabase's /authorize endpoint after the browser redirect.
  if (error) throw error;
}

/** Signs the current user out. */
export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

/** Returns the current auth user, or null if not signed in. */
export async function getAuthUser(): Promise<{ id: string; email?: string; name?: string } | null> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id:    user.id,
    email: user.email,
    name:  user.user_metadata?.["full_name"] as string | undefined,
  };
}
