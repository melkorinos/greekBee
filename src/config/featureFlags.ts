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
}

export const FEATURE_FLAGS: FeatureFlags = {
  achievements: false,
};
