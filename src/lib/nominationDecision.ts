// nominationDecision.ts — the decision layer behind NominationModal.
//
// Three pure decisions the modal used to derive inline, twice over:
//   - deriveBanner: which single banner (if any) applies to the typed word
//   - guardSubmit:  whether a submit may proceed, or why it may not
//   - pivotFor:     what the server's 422/409 answers mean in lookup terms
//
// The ladder (blocked → rejected → accepted → pending) is stated once, in
// deriveBanner; guardSubmit reads it rather than re-deriving it. The modal keeps
// fetching, state and render, and calls in here at both decision points.

/** What /api/nominations/lookup tells us about one normalised word. */
export interface NominationLookup {
  /** The normalised word this result applies to. */
  word:      string;
  /** A proper noun / month / place / foreign word we refuse. */
  blocked:   boolean;
  rejected:  number;
  /** Approved but not yet released (not in the dictionary yet). */
  accepted:  number;
  pending:   number;
  /** Id of the existing pending proposal, to upvote instead. */
  pendingId: string | null;
}

/** The one banner that applies, or null when the word is clean. */
export type NominationBanner = "blocked" | "rejected" | "accepted" | "pending" | null;

/**
 * The banner for `key`, or null. A lookup only speaks for the word it was run
 * for, so a stale result (the player kept typing) yields null. At most one
 * banner shows: blocked wins over rejected, which wins over accepted, which
 * wins over pending.
 */
export function deriveBanner(lookup: NominationLookup | null, key: string): NominationBanner {
  if (!lookup || lookup.word !== key) return null;
  if (lookup.blocked)      return "blocked";
  if (lookup.rejected > 0) return "rejected";
  if (lookup.accepted > 0) return "accepted";
  if (lookup.pending  > 0) return "pending";
  return null;
}

/** Verdict on a submit attempt. `ok: false` carries why, for the modal to surface. */
export type SubmitGuard =
  | { ok: true }
  /** Blocklisted — never post; the block banner explains it. */
  | { ok: false; reason: "blocked" }
  /** Previously rejected — an explanation is mandatory before re-submitting. */
  | { ok: false; reason: "note-required" }
  /** Already approved and awaiting release — re-proposing is pointless. */
  | { ok: false; reason: "accepted" }
  /** An identical proposal is pending — upvote it instead of inserting a duplicate. */
  | { ok: false; reason: "pending"; pendingId: string };

/**
 * Whether a submit for `lookup.word` may proceed. `lookup` must be current for
 * the word being posted (or null when the lookup failed — a network failure
 * never blocks submission; the server's 422/409 are the backstop).
 */
export function guardSubmit(lookup: NominationLookup | null, note: string): SubmitGuard {
  const banner = lookup ? deriveBanner(lookup, lookup.word) : null;

  switch (banner) {
    case "blocked":
      return { ok: false, reason: "blocked" };
    case "rejected":
      return note.trim() ? { ok: true } : { ok: false, reason: "note-required" };
    case "accepted":
      return { ok: false, reason: "accepted" };
    case "pending":
      // Without an id there is nothing to pivot to, so let the post through and
      // let the DB's uniqueness backstop answer 409 with the id.
      return lookup!.pendingId
        ? { ok: false, reason: "pending", pendingId: lookup!.pendingId }
        : { ok: true };
    default:
      return { ok: true };
  }
}

/**
 * The lookup a POST's refusal implies, or null when the response was not a
 * refusal this module knows. Both cases re-state client-side what the server
 * just decided, so the same banners surface as if the lookup had caught it:
 *   - 422: blocklisted word our lookup missed (e.g. the lookup request failed)
 *   - 409: the DB's pending-uniqueness backstop fired — an identical proposal
 *     landed between our lookup and our POST
 */
export function pivotFor(
  status: number,
  word:   string,
  body:   { pendingId?: string | null } | null,
): NominationLookup | null {
  if (status === 422) {
    return { word, blocked: true, rejected: 0, accepted: 0, pending: 0, pendingId: null };
  }
  if (status === 409) {
    return { word, blocked: false, rejected: 0, accepted: 0, pending: 1, pendingId: body?.pendingId ?? null };
  }
  return null;
}
