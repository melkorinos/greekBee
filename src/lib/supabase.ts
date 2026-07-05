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

// Untyped client — tables are typed at the call site via WordSuggestionInsert.
// Using the Database generic on createClient requires matching supabase-js
// internal GenericSchema exactly, which is brittle across minor versions.
let _client: ReturnType<typeof createClient> | null = null;

/**
 * Returns the singleton Supabase client.
 * Safe to call in browser or API-route code; will throw at runtime (not build
 * time) if the env vars are missing — which surfaces the misconfiguration clearly.
 */
export function getSupabaseClient(): ReturnType<typeof createClient> {
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
export function getTokenScopedClient(accessToken: string): ReturnType<typeof createClient> {
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
export function getServiceRoleClient(): ReturnType<typeof createClient> {
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
