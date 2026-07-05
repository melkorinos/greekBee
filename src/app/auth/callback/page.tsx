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
import { adoptDeviceIdentity, getOrCreateDeviceId } from "@/hooks/useGameStore";

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

      const deviceId    = getOrCreateDeviceId();
      const accessToken = data.session.access_token;
      let   wasRestored = false;

      // The route derives auth_user_id + Google name from the verified JWT;
      // the body carries only this device's id. (ADR 0012 §6.) The response
      // hands back the canonical identity: on Sign-in Restore it differs from
      // this device, and we adopt it (identity + merged history live server-side).
      try {
        const res = await fetch("/api/auth/link", {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body:    JSON.stringify({ device_uuid: deviceId }),
        });
        if (res.ok) {
          const link = (await res.json()) as {
            device_uuid?: string; display_name?: string; restored?: boolean;
          };
          if (link.device_uuid && link.device_uuid !== deviceId) {
            adoptDeviceIdentity(link.device_uuid, link.display_name);
            // Signal games to re-hydrate found words under the adopted identity.
            localStorage.setItem("leksokipos-needs-restore", "true");
            // Flag the "welcome back" signal for the destination page.
            if (link.restored) {
              wasRestored = true;
              sessionStorage.setItem("signin-restore-welcome", link.display_name ?? "");
            }
          }
        }
      } catch {
        // Sign-in still succeeded; identity linking is best-effort.
      }

      // Sign-in Restore lands on /profile — the proof surface (adopted name,
      // merged stats, trophy case, welcome banner). Normal sign-in returns to
      // the saved origin page. Either way, clear the saved redirect key.
      const redirectTo = wasRestored ? "/profile" : (sessionStorage.getItem("auth-redirect") ?? "/");
      sessionStorage.removeItem("auth-redirect");
      router.replace(redirectTo);
    }).catch(() => { setError("Αποτυχία σύνδεσης. Δοκίμασε ξανά."); });
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-foreground">
        <p className="text-sm">{error}</p>
        <Link href="/" className="text-xs underline text-muted">Επιστροφή στην αρχική</Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-sm text-muted animate-pulse">Σύνδεση…</p>
    </div>
  );
}
