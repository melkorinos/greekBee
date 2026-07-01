"use client";

// useLeaderboardProfileSlot — the profile-related props shared by every game
// leaderboard wrapper.
//
// Each game's leaderboard modal previously duplicated, byte-for-byte, the same
// useLeaderboardProfile call, the same <ProfileSection> topSlot, and the same
// name-editor flags. This hook owns that block once and returns a bundle to
// spread onto LeaderboardModalBase.

import type { LeaderboardModalBaseProps } from "@/components/shared/LeaderboardModal";
import type { LeaderboardProfileProps } from "@/hooks/useLeaderboardProfile";
import { ProfileSection } from "@/components/shared/ProfileSection";
import { useLeaderboardProfile } from "@/hooks/useLeaderboardProfile";

type SlotProps = LeaderboardProfileProps & {
  displayName: string;
  onSaveName:  (name: string) => void;
};

type SlotResult = Pick<
  LeaderboardModalBaseProps,
  "topSlot" | "showNameEditor" | "saveButtonAlwaysActive" | "onSaveName"
>;

export function useLeaderboardProfileSlot({
  profileLinked,
  displayName,
  onSaveName,
  onProfileCreate,
  onTransferGenerate,
  onTransferClaim,
  onDisconnect,
  authLinked,
  authUserName,
  onSignIn,
  onSignOut,
}: SlotProps): SlotResult {
  const { createError, handleSave } = useLeaderboardProfile({
    profileLinked,
    onProfileCreate,
    onSaveName,
  });

  return {
    showNameEditor: true,
    saveButtonAlwaysActive: !profileLinked,
    onSaveName: (name) => void handleSave(name),
    topSlot: (
      <ProfileSection
        profileLinked={profileLinked}
        displayName={displayName}
        createError={createError ?? undefined}
        onTransferGenerate={onTransferGenerate}
        onTransferClaim={onTransferClaim}
        onDisconnect={onDisconnect}
        authLinked={authLinked}
        authUserName={authUserName}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onSaveName={(name) => void handleSave(name)}
      />
    ),
  };
}
