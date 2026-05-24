"use client";

// useScorePost — base infrastructure shared by all score-submission hooks.
//
// Owns the displayName ref pattern so no game hook ever deals with stale closures.
// Returns a stable `post` that auto-injects display_name from the ref.
// Pass an explicit nameOverride to bypass the ref (used by submitWithName flows).

import { postScore } from "@/lib/postScore";
import { useCallback, useEffect, useRef } from "react";

export function useScorePost(displayName: string) {
  const displayNameRef = useRef(displayName);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

  const post = useCallback(
    (endpoint: string, payload: Record<string, unknown>, nameOverride?: string) => {
      postScore(endpoint, {
        ...payload,
        display_name: nameOverride || displayNameRef.current || "Ανώνυμος",
      });
    },
    [], // stable — display_name is read from the ref at call time
  );

  return { post };
}
