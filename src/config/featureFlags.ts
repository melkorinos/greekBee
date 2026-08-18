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
   * Sound Cues (ADR 0021): the 🔊 / 🔇 toggle in the Shell header. Off = the button
   * does not render at all. The hook (`useSoundCue`), the preference
   * (`useSoundEnabled`) and the three Leksokipos Cues stay wired and inert behind
   * it, exactly as Offline Mode is parked — this flag hides one control, it does
   * not dismantle the machine.
   *
   * ON since 2026-08-17: the condition this flag waited on is met. All three Cues
   * now make a sound — `pangram` and `missingCenter` are committed MP3s in
   * `public/sounds/`, `wordFound` is synthesized — so the toggle no longer switches
   * between silence and silence. The last open item on TICKET-05 is the operator's
   * ear check on a phone, which needs this button visible in order to happen.
   */
  soundCues: boolean;
}

export const FEATURE_FLAGS: FeatureFlags = {
  achievements: true,
  soundCues:    true,
};
