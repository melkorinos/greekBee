// supabase.ts — singleton Supabase client for browser usage.
//
// Uses the anon (public) key. Row Level Security on each table controls
// what the anon role is allowed to do — currently insert-only on word_suggestions.
//
// Environment variables (set in .env.local for local dev; Vercel dashboard for prod):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

import { createClient } from "@supabase/supabase-js";

// Typed schema — extend this as new tables are added.
export interface Database {
  public: {
    Tables: {
      scores: {
        Row: {
          id:           string;
          puzzle_id:    string;
          device_id:    string;
          display_name: string;
          score:        number;
          created_at:   string;
        };
        Insert: {
          id?:           string;
          puzzle_id:     string;
          device_id:     string;
          display_name?: string;
          score:         number;
          created_at?:   string;
        };
        Update: Partial<Database["public"]["Tables"]["scores"]["Insert"]>;
      };
      word_suggestions: {
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
        Update: Partial<Database["public"]["Tables"]["word_suggestions"]["Insert"]>;
      };
      nomination_votes: {
        Row: {
          id:            string;
          nomination_id: string;
          device_id:     string;
          created_at:    string;
        };
        Insert: {
          id?:            string;
          nomination_id:  string;
          device_id:      string;
          created_at?:    string;
        };
        Update: Partial<Database["public"]["Tables"]["nomination_votes"]["Insert"]>;
      };
    };
  };
}

export type WordSuggestionInsert =
  Database["public"]["Tables"]["word_suggestions"]["Insert"];

export type WordSuggestionRow =
  Database["public"]["Tables"]["word_suggestions"]["Row"];

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
