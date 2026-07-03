"use client";

// useAuth — Google OAuth state for the platform.
//
// Reads the Supabase session on mount, subscribes to auth state changes,
// and keeps the authLinked flag in useGameStore in sync.
//
// On first sign-in: calls POST /api/auth/link to merge the active DeviceId
// with the Google auth_user_id, back-filling game_scores and player_profiles.
//
// Exposes:
//   authLinked      — true when a Google account is connected
//   authUserName    — Google display name (null when not linked)
//   signInWithGoogle — initiates the OAuth redirect
//   signOut         — signs out and clears authLinked
//   isLoading       — true during the initial session check

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient, signInWithGoogle as supabaseSignIn, signOut as supabaseSignOut } from "@/lib/supabase";
import { disconnectIdentity, isAuthLinked, setAuthLinked, setProfileLinked } from "@/hooks/useGameStore";
import { reloadApp } from "@/lib/reload";

export interface UseAuthReturn {
  authLinked:       boolean;
  authUserName:     string | null;
  signInWithGoogle: () => Promise<void>;
  signOut:          () => Promise<void>;
  isLoading:        boolean;
}

export function useAuth(): UseAuthReturn {
  const [authLinked,   setAuthLinkedState]   = useState<boolean>(() =>
    typeof window === "undefined" ? false : isAuthLinked(),
  );
  const [authUserName, setAuthUserName]      = useState<string | null>(null);
  const [isLoading,    setIsLoading]         = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Resolve initial session without awaiting — sets loading=false either way.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const name = (session.user.user_metadata?.["full_name"] as string | undefined) ?? null;
        setAuthUserName(name);
        setAuthLinkedState(true);
        setAuthLinked(true);
        setProfileLinked(true);
      } else {
        setAuthLinkedState(false);
        setAuthLinked(false);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));

    // Keep in sync with sign-in/sign-out events (e.g. from /auth/callback redirect).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const name = (session.user.user_metadata?.["full_name"] as string | undefined) ?? null;
        setAuthUserName(name);
        setAuthLinkedState(true);
        setAuthLinked(true);
        setProfileLinked(true);
      } else {
        setAuthUserName(null);
        setAuthLinkedState(false);
        setAuthLinked(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await supabaseSignIn();
  }, []);

  const signOut = useCallback(async () => {
    await supabaseSignOut();
    // Google sign-out IS a Disconnect (ADR 0012 §5): fully reset local identity
    // so an adopted account can't leak to the next person on a shared device.
    disconnectIdentity();
    setAuthLinkedState(false);
    setAuthUserName(null);
    setAuthLinked(false);
    // Mounted boards still hold the old identity's deviceId and session state
    // in React memory — only a reload makes the device truly anonymous.
    reloadApp();
  }, []);

  return { authLinked, authUserName, signInWithGoogle, signOut, isLoading };
}
