/**
 * Platform feature flags — compile-time on/off switches for features that ship in
 * the codebase but are not yet ready to be visible in production. There is no
 * per-environment split: a flag is on or off everywhere. Flip to `true` to light
 * the feature up; the type is `boolean` (not a literal) so call-site conditionals
 * stay meaningful and turning a flag on is a one-character change.
 */
export interface FeatureFlags {
  /**
   * Achievements (Epic B): the Trophy Case on /profile, the in-game unlock toasts,
   * and the achievement/pangram *recording* pipeline (`useAchievementSync` →
   * /api/achievements + /api/pangrams). Off = fully dark: no UI, no toasts, and no
   * writes to those tables. Leaderboard score-posting (`game_scores`) is a separate
   * pipeline and is unaffected. Kept off until the feature is launch-ready; per
   * ADR 0013 the beta trophy data resets at official release anyway.
   */
  achievements: boolean;

  /**
   * Sound Cues (ADR 0021). Off = `useSoundCue.play()` is a no-op, so nothing is
   * fetched, no AudioContext is opened and no Cue sounds anywhere on the Platform.
   * The hook, the preference (`useSoundEnabled`) and both MP3s stay wired and
   * inert behind it, exactly as Offline Mode is parked.
   *
   * ON since 2026-08-17, when the audio landed.
   *
   * **What this flag gates changed on 2026-08-26.** It used to gate the 🔊 / 🔇
   * button in the Shell header; that button was removed by operator decision, and
   * a flag guarding a control that no longer exists guards nothing. It now guards
   * playback, which makes it the Platform's ONLY off switch for sound — there is
   * no in-app control any more, so if a round of players finds the blip annoying,
   * this one edit is the answer. It does not touch anyone's stored preference.
   */
  soundCues: boolean;
}

export const FEATURE_FLAGS: FeatureFlags = {
  achievements: true,
  soundCues:    true,
};
