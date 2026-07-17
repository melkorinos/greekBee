// supabase.ts — singleton Supabase client for browser usage.
//
// Uses the anon (public) key. Row Level Security on each table controls
// what the anon role is allowed to do — currently insert-only on nominations.
//
// Environment variables (set in .env.local for local dev; Vercel dashboard for prod):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

import { createClient } from "@supabase/supabase-js";

import type { Database, Json } from "./database.types";

export type { Database, Json };

/**
 * Every table in the public schema. table() is generic over this union, so a
 * typo'd or dropped table name is a compile error rather than a runtime 404.
 */
export type TableName = keyof Database["public"]["Tables"];

/** A table's row shape, as the DB actually declares it. */
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];

/** A table's insert payload, as the DB actually declares it. */
export type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];

/** A table's update payload, as the DB actually declares it. */
export type Update<T extends TableName> = Database["public"]["Tables"][T]["Update"];

/**
 * The Supabase client shape returned by every getter in this module — carrying
 * the generated Database schema, so every query is checked against the real DB.
 */
export type SupabaseClient = ReturnType<typeof createClient<Database>>;

// ── The table accessor ────────────────────────────────────────────────────────
//
// This module owns the client/schema pairing exactly once. Call sites never
// touch .from(), so the schema is wired in here and nowhere else.
//
// Generic over TableName rather than taking a `string`: that is what makes the
// returned builder resolve to *this* table's Row/Insert types, which is the
// whole point of typing the client. Every caller passes a literal, so the union
// is inferred with no annotation at the call site.

/**
 * Returns a query builder for `name` on `client`. Pass the client explicitly —
 * the anon singleton, a token-scoped client, and the service-role client are
 * all valid callers and the choice is security-relevant, so it stays visible at
 * the call site.
 */
export function table<T extends TableName>(client: SupabaseClient, name: T) {
  return client.from(name);
}

/**
 * A table accessor already bound to one client, for routes that make many calls
 * against the same client and read better without it repeated (see the `db`
 * shorthand in api/auth/link). Generic so the per-table types survive binding.
 */
export type BoundTable = <T extends TableName>(name: T) => ReturnType<typeof table<T>>;

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
  _client = createClient<Database>(url, key, {
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
  return createClient<Database>(url, key, {
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
  return createClient<Database>(url, key, { auth: { persistSession: false } });
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
