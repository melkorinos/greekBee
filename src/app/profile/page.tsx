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

import { Shell } from "@/components/shared/Shell";
import { ProfileSection } from "@/components/shared/ProfileSection";
import { IdentityHeader } from "@/components/profile/IdentityHeader";
import { WelcomeBackBanner } from "@/components/profile/WelcomeBackBanner";
import { LifetimeStatsStrip } from "@/components/profile/LifetimeStatsStrip";
import { TrophyCase } from "@/components/profile/TrophyCase";
import { useGameIdentity } from "@/hooks/useGameIdentity";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { setDisplayName as storeSetDisplayName } from "@/hooks/useGameStore";

export default function ProfilePage() {
  const { deviceId, displayName, setDeviceId, setDisplayName } = useGameIdentity();
  const { authLinked, authUserName, signInWithGoogle, signOut } = useAuth();

  const {
    profileLinked,
    generateTransferCode,
    claimTransferCode,
    disconnect,
  } = useProfile({
    deviceId,
    onDeviceIdChange:    setDeviceId,
    onDisplayNameChange: setDisplayName,
  });

  function handleSaveName(name: string) {
    const trimmed = name.trim() || "Ανώνυμος";
    storeSetDisplayName(trimmed);
    setDisplayName(trimmed);
  }

  return (
    <Shell>
      <div className="w-full max-w-sm mx-auto px-4 py-6 space-y-4">
        <h1 className="text-lg font-semibold text-foreground px-1">Το προφίλ μου</h1>

        <WelcomeBackBanner />

        <section className="rounded-2xl border border-border bg-surface overflow-hidden">
          <IdentityHeader
            authLinked={authLinked}
            profileLinked={profileLinked}
            displayName={displayName}
            authUserName={authUserName}
          />
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
            onSaveName={handleSaveName}
            showProfileLink={false}
          />
        </section>

        <section className="rounded-2xl border border-border bg-surface overflow-hidden">
          <LifetimeStatsStrip deviceId={deviceId} />
        </section>

        <section className="rounded-2xl border border-border bg-surface overflow-hidden">
          <TrophyCase />
        </section>
      </div>
    </Shell>
  );
}
