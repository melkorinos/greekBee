// shareText.test.ts — the shared four-line spine every Game's share text is
// assembled by (ADR 0025). The spine owns the identity line, the score line and
// the link; the Game owns only its summary rows.
//
// The two rulings under test that cost a decision each: the link carries NO
// `?puzzle=` date param (a dated link is right for the hour it is posted and
// wrong forever after), and the identity line carries the GAME's name and never
// the Platform's (`Leksarxeia`/`Leksiarxeio` are one letter apart).

import { describe, expect, it } from "vitest";

import { PLATFORM_NAME } from "@/config/platform";
import { composeShareText } from "@/lib/shareText";

describe("composeShareText", () => {
  it("assembles identity, rows, score and link in that order", () => {
    const text = composeShareText({
      gameId: "leksiarxeio",
      date:   "2026-08-17",
      rows:   ["🟩🟩⬛🟩🟩"],
      score:  17,
    });

    const lines = text.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe("Leksiarxeio 17/08");
    expect(lines[1]).toBe("🟩🟩⬛🟩🟩");
    expect(lines[2]).toBe("Σκορ: 17");
    expect(lines[3]).toMatch(/^https?:\/\/.+\/leksiarxeio$/);
  });

  it("carries no date parameter in the link", () => {
    const text = composeShareText({
      gameId: "leksodromia",
      date:   "2026-08-17",
      rows:   ["✅"],
      score:  720,
    });

    expect(text).not.toContain("?puzzle=");
    expect(text).not.toContain("2026-08-17");
  });

  it("never names the Platform", () => {
    const text = composeShareText({
      gameId: "leksoplegma",
      date:   "2026-08-17",
      rows:   ["🟩🟩 +4"],
      score:  640,
    });

    expect(text).not.toContain(PLATFORM_NAME);
  });

  it("keeps every row a Game supplies, in order (Topothesies has two)", () => {
    const text = composeShareText({
      gameId: "topothesies",
      date:   "2026-08-17",
      rows:   ["🗺️ ⬛↗ 🟩", "🏛️ ⬛ 🟩"],
      score:  4,
    });

    const lines = text.split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe("🗺️ ⬛↗ 🟩");
    expect(lines[2]).toBe("🏛️ ⬛ 🟩");
  });

  it("pads a single-digit day and month to DD/MM", () => {
    const text = composeShareText({
      gameId: "leksokipos",
      date:   "2026-01-05",
      rows:   ["🌸 Απολυτότητα"],
      score:  187,
    });

    expect(text.split("\n")[0]).toBe("Leksokipos 05/01");
  });
});
