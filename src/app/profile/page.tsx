"use client";

// /profile — the durable home for identity, and the manual-verification surface
// for Google sign-in / Sign-in Restore (ADR 0012).
//
// Composition:
//   IdentityHeader     — display-only state (avatar + status line)
//   WelcomeBackBanner  — one-shot Sign-in Restore greeting
//   ProfileSection     — reused verbatim for all interactive account flows
//
// Wiring mirrors HomeTrophyButton: useGameIdentity + useAuth + useProfile, with a
// local name-save. Later slices add the lifetime-stats strip and the trophy case.

import { ProfileSection } from "@/components/shared/ProfileSection";
import { IdentityHeader } from "@/components/profile/IdentityHeader";
import { NameEditor } from "@/components/profile/NameEditor";
import { WelcomeBackBanner } from "@/components/profile/WelcomeBackBanner";
import { LifetimeStatsStrip } from "@/components/profile/LifetimeStatsStrip";
import { WordsByLengthCard } from "@/components/profile/WordsByLengthCard";
import { TrophyCase } from "@/components/profile/TrophyCase";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { usePlayerIdentity } from "@/hooks/usePlayerIdentity";
import { cardShell } from "@/styles/recipes";
import { useSyncExternalStore } from "react";

// Server and first client paint both read `false`; after hydration the client
// reads `true`. Lets us gate client-only identity UI without a setState-in-effect
// mount flag (which trips react-hooks/set-state-in-effect).
const subscribeNoop = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

export default function ProfilePage() {
  const {
    deviceId,
    displayName,
    profileLinked,
    authLinked,
    authUserName,
    createProfile,
    generateTransferCode,
    claimTransferCode,
    disconnect,
    signInWithGoogle,
    signOut,
  } = usePlayerIdentity();

  // Every panel below reads client-only identity (localStorage device/name + the
  // Supabase session), which is empty on the server and filled on the client —
  // rendering it during hydration mismatches the server HTML. Gate on mount so the
  // server and first client paint agree, then swap in the real content.
  const mounted = useMounted();

  // Persist the rename: createProfile POSTs /api/profile (which fans the name out
  // to the player's game_scores rows) and updates the local store. For an already
  // linked or Google-authed device the row simply updates; for an anonymous device
  // it creates the profile — the same semantics as naming yourself in-game.
  async function handleSaveName(name: string) {
    await createProfile(name);
  }

  if (!mounted) {
    return (
      <div className="w-full max-w-game mx-auto px-4 py-6 space-y-4">
        <h1 className="text-lg font-semibold text-foreground px-1">Το προφίλ μου</h1>
        <div className={`${cardShell} h-48 animate-pulse`} aria-hidden />
      </div>
    );
  }

  return (
    <div className="w-full max-w-game mx-auto px-4 py-6 space-y-4">
      <h1 className="text-lg font-semibold text-foreground px-1">Το προφίλ μου</h1>

      <WelcomeBackBanner />

      <section className={`${cardShell} overflow-hidden`}>
        <IdentityHeader
          authLinked={authLinked}
          profileLinked={profileLinked}
          displayName={displayName}
          authUserName={authUserName}
        />
        <hr className="border-border" />
        <NameEditor displayName={displayName} onSave={handleSaveName} />
        <hr className="border-border" />
        <ProfileSection
          profileLinked={profileLinked}
          displayName={displayName}
          authLinked={authLinked}
          authUserName={authUserName}
          onTransferGenerate={generateTransferCode}
          onTransferClaim={claimTransferCode}
          onDisconnect={disconnect}
          onSignIn={signInWithGoogle}
          onSignOut={signOut}
          showProfileLink={false}
        />
      </section>

      <section className={`${cardShell} overflow-hidden`}>
        <LifetimeStatsStrip deviceId={deviceId} />
      </section>

      {/* Words-by-length + Trophy Case hidden until achievements ship — word capture
          rides the same flag, so before launch there is no data to show. */}
      {FEATURE_FLAGS.achievements && (
        <>
          <section className={`${cardShell} overflow-hidden`}>
            <WordsByLengthCard deviceId={deviceId} />
          </section>
          <section className={`${cardShell} overflow-hidden`}>
            <TrophyCase deviceId={deviceId} />
          </section>
        </>
      )}
    </div>
  );
}
