"use client";

// /auth/callback — handles the Google OAuth PKCE redirect.
//
// Flow:
//   1. Supabase redirects here with ?code=<pkce-code> after Google sign-in.
//   2. Exchange the code for a session (sets the auth cookie/localStorage token).
//   3. Call POST /api/auth/link to merge the active DeviceId with the auth user.
//   4. Redirect to the page the player came from (saved in sessionStorage).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { getOrCreateDeviceId } from "@/hooks/useGameStore";

export default function AuthCallbackPage() {
  const router = useRouter();

  // Detect missing code at init time so we never call setState inside the effect body.
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).has("code")
      ? null
      : "Λείπει ο κωδικός επιβεβαίωσης.";
  });

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return; // error already set in useState initialiser

    const supabase = getSupabaseClient();

    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error: exchangeError }) => {
      if (exchangeError || !data.session?.user) {
        setError("Αποτυχία σύνδεσης. Δοκίμασε ξανά.");
        return;
      }

      const user     = data.session.user;
      const deviceId = getOrCreateDeviceId();
      const authName = (user.user_metadata?.["full_name"] as string | undefined) ?? null;

      await fetch("/api/auth/link", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          device_uuid:  deviceId,
          auth_user_id: user.id,
          display_name: authName,
        }),
      }).catch(() => {});

      const redirectTo = sessionStorage.getItem("auth-redirect") ?? "/";
      sessionStorage.removeItem("auth-redirect");
      router.replace(redirectTo);
    }).catch(() => { setError("Αποτυχία σύνδεσης. Δοκίμασε ξανά."); });
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-foreground">
        <p className="text-sm">{error}</p>
        <Link href="/" className="text-xs underline text-stone-500">Επιστροφή στην αρχική</Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-sm text-stone-500 animate-pulse">Σύνδεση…</p>
    </div>
  );
}
