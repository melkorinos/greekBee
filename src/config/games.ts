/**
 * Central Game Registry — single source of truth for every Game on the Platform.
 * Add a new Game here; Shell nav and picker card update automatically.
 * Picker-specific content (rules, HowToPlay copy) stays in app/page.tsx.
 *
 * PRESENTATION derives, BEHAVIOUR enrols. Everything a Game *looks* like — drawer
 * nav, picker card, SEO description, accent token, Offline Mode — is derived from
 * the rows below, so a new Game is visible by default and a `wip` flip is one edit.
 * Everything a Game *does* to the shared database is an explicit `capabilities`
 * entry, so a new Game is inert by default: it writes nothing until someone says so
 * here. Both wip content games shipped placeholder Scores into production precisely
 * because the old lists spelled this "everything except…".
 *
 * TWO PRESENTATION STATES, and they are ORTHOGONAL (ADR 0022):
 *
 *   `wip`    — the Game is UNFINISHED. Placeholder content, missing copy, an
 *              unflipped flag. Says nothing about whether a player can see it.
 *   `hidden` — the Game is DELIBERATELY NOT SHOWN, finished or not. It is absent
 *              from the picker and the drawer, and its route stays live: anyone
 *              holding the link still plays it. Not a redirect, not a 404.
 *
 * Leksindeseis is why the split exists: it is finished and community-backed, and
 * it is out of scope for launch. Collapsing the two back into one flag would lose
 * that distinction and re-brand a finished Game as unfinished.
 */

/**
 * What a registered Game is allowed to DO, beyond existing on the Platform.
 *
 * - `scores`      — may post rows to game_scores (widens ScoreSubmissionGameId).
 * - `leaderboard` — has a board to rank them on (widens LeaderboardGameId, and so
 *                   requires a row in GAME_LEADERBOARD_CONFIG).
 *
 * Deliberately NOT a capability: drawer section, Offline Mode, SEO. Those are
 * presentation and stay derived — see the header note.
 */
export type GameCapability = "scores" | "leaderboard";

interface GameRegistryRow {
  label:        string;
  emoji:        string;
  title:        string;
  /**
   * One-line pitch, shown on the picker card. Keep it under ~48 characters:
   * the card gives it exactly two lines at the 24rem picker width and clamps
   * whatever does not fit, so a longer string loses its ending to an ellipsis.
   */
  description:  string;
  href:         string;
  /** Unfinished. Independent of `hidden` — see the header block. */
  wip:          boolean;
  /** Not listed on any player-facing surface. The route stays live regardless. */
  hidden:       boolean;
  capabilities: readonly GameCapability[];
}

export const GAME_REGISTRY = {
  leksokipos: {
    label:       "🌸 Leksokipos",
    emoji:       "🌸",
    title:       "Leksokipos",
    description: "Βρες λέξεις με τα 7 γράμματα του κήπου.",
    href:         "/leksokipos",
    wip:          false,
    hidden:       false,
    capabilities: ["scores", "leaderboard"],
  },
  leksiarxeio: {
    label:       "✏️ Leksiarxeio",
    emoji:       "✏️",
    title:       "Leksiarxeio",
    description: "Μάντεψε τις λέξεις της ημέρας σε 6 προσπάθειες.",
    href:         "/leksiarxeio",
    wip:          false,
    hidden:       false,
    // Stripped of both capabilities before launch (ADR 0027): the leaderboard was
    // removed, and a Score that nothing ranks is a write worth nothing. Scoring is
    // gone whole — there is no πόντοι number left in the Game to post.
    capabilities: [],
  },
  // Fully built and community-backed, but DELIBERATELY still wip:true — confirmed
  // by the operator on 2026-08-06, when a docs audit found every doc calling it
  // Live. Do not "fix" this flag; promoting it is a launch decision.
  //
  // hidden:true since 2026-08-12 (TICKET-06): out of scope for the soft launch.
  // This is the row the `wip`/`hidden` split exists for — the Game is FINISHED and
  // simply not launching, which is not the same fact as `wip`.
  leksindeseis: {
    label:       "🔗 Leksindeseis",
    emoji:       "🔗",
    title:       "Leksindeseis",
    description: "Ομαδοποίησε 16 λέξεις σε 4 κατηγορίες των 4.",
    href:         "/leksindeseis",
    wip:          true,
    hidden:       true,
    // wip:true is a launch decision, not missing content (see above) — the Game is
    // finished and community-backed, so it keeps both capabilities. Hiding it does
    // not revoke them: the route stays live and a Score posted from it is real.
    capabilities: ["scores", "leaderboard"],
  },
  vrestifrasi: {
    label:       "💬 Vres Tin Frasi",
    emoji:       "💬",
    title:       "Vres Tin Frasi",
    description: "Βρες τη φράση της ημέρας σε 6 προσπάθειες.",
    href:         "/vres-tin-frasi",
    wip:          false,
    hidden:       false,
    // Same pass as leksiarxeio (ADR 0027): leaderboard and Score both removed. The
    // Game stays live and listed — revoking capabilities is not hiding it.
    capabilities: [],
  },
  leksodromia: {
    label:       "🏁 Leksodromia",
    emoji:       "🏁",
    title:       "Leksodromia",
    description: "Ξεμπέρδεψε 10 λέξεις όσο πιο γρήγορα μπορείς.",
    href:         "/leksodromia",
    wip:          false,
    hidden:       false,
    capabilities: ["scores", "leaderboard"],
  },
  leksoplegma: {
    label:       "🕸️ Leksoplegma",
    emoji:       "🕸️",
    title:       "Leksoplegma",
    description: "Βρες τις κρυμμένες λέξεις στο πλέγμα.",
    href:         "/leksoplegma",
    wip:          false,
    hidden:       false,
    capabilities: ["scores", "leaderboard"],
  },
  stavrolekso: {
    label:       "♟️ Stavrolekso",
    emoji:       "♟️",
    title:       "Stavrolekso",
    description: "Λύσε και δημιούργησε σταυρόλεξα της κοινότητας.",
    href:         "/stavrolekso",
    wip:          false,
    hidden:       false,
    // A browsable pool of community crosswords, not a dated Puzzle — no Score to
    // post and nothing to rank.
    capabilities: [],
  },
  leksikastirio: {
    label:       "⚖️ Leksikastirio",
    emoji:       "⚖️",
    title:       "Leksikastirio",
    description: "Ψήφισε λέξεις για προσθήκη ή αφαίρεση.",
    href:         "/leksikastirio",
    wip:          false,
    hidden:       false,
    // The community word-court, not a Game at all (CONTEXT.md).
    capabilities: [],
  },
  // Worldle-style Greek geography game (guess the regional unit from its
  // silhouette, then its capital). `topothesies` is the permanent internal id
  // (routes/types/dirs). Published after operator play-through (session 121).
  topothesies: {
    label:       "🗺️ Topothesies",
    emoji:       "🗺️",
    title:       "Topothesies",
    description: "Μάντεψε την περιφερειακή ενότητα από το σχήμα.",
    href:         "/topothesies",
    wip:          false,
    hidden:       false,
    capabilities: ["scores", "leaderboard"],
  },
  // Daily "guess the supermarket price" game. Ships wip:true (single placeholder
  // puzzle + sample photo); flip to false once real content is sourced (photos +
  // gov reference prices). No handoff or issue tracks that work any more — the
  // live summary is the «Πόσο κάνει;» section of .claude/aiHelper/reflections.md.
  // hidden:true since 2026-08-12 (TICKET-06) — unfinished AND out of scope for the
  // soft launch. Both flags are true here for two independent reasons.
  posokanei: {
    label:       "🛒 Πόσο κάνει;",
    emoji:       "🛒",
    title:       "Πόσο κάνει;",
    description: "Μάντεψε την τιμή του προϊόντος του σούπερ μάρκετ.",
    href:         "/posokanei",
    wip:          true,
    hidden:       true,
    // No capabilities while the content is a single placeholder puzzle: a Score
    // against a fake price is a permanent junk row in the shared production
    // game_scores table, which is append-forever. Grant both the day real content
    // lands, together with the wip flip.
    capabilities: [],
  },
  // Daily "guess the Greek company from its name-stripped logo mark" game. Ships
  // wip:true (single placeholder puzzle); flip to false once ~30 real brands are
  // sourced (mark assets + accept-lists). Brief:
  // .claude/handoffs/logopaignio-content-pool.md — deliberately off the launch map.
  // hidden:true since 2026-08-12 (TICKET-06), same as posokanei: unfinished AND
  // out of scope for the soft launch.
  logopaignio: {
    label:       "🔎 Λογοπαίγνιο",
    emoji:       "🔎",
    title:       "Λογοπαίγνιο",
    description: "Μάντεψε την εταιρεία από το λογότυπό της.",
    href:         "/logopaignio",
    wip:          true,
    hidden:       true,
    // Same as posokanei: one placeholder brand, so nothing worth writing yet.
    capabilities: [],
  },
} as const satisfies Record<string, GameRegistryRow>;

/** The ID of any registered Game. */
export type RegistryGameId = keyof typeof GAME_REGISTRY;

/**
 * The registered Games that declare `cap`. Opt-in by construction: a Game absent
 * from the union cannot be passed to the surface that consumes it, so granting the
 * capability is a compile error until the registry row says so.
 */
export type GameIdWith<C extends GameCapability> = {
  [K in RegistryGameId]: C extends (typeof GAME_REGISTRY)[K]["capabilities"][number] ? K : never;
}[RegistryGameId];

/** Runtime counterpart of GameIdWith — same set, for filtering and drift guards. */
export function gameIdsWith<C extends GameCapability>(cap: C): GameIdWith<C>[] {
  return (Object.keys(GAME_REGISTRY) as RegistryGameId[]).filter(
    (id) => (GAME_REGISTRY[id].capabilities as readonly GameCapability[]).includes(cap),
  ) as GameIdWith<C>[];
}
