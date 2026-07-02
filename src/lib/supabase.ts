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
          auth_user_id: string | null;
        };
        Insert: {
          id?:           number;
          game_id:       string;
          puzzle_date:   string;
          device_id:     string;
          display_name?: string;
          score:         number;
          data?:         Record<string, unknown>;
          auth_user_id?: string | null;
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

  _client = createClient(url, key);
  return _client;
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
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
    },
  });
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
