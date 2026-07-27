import { describe, expect, it } from "vitest";

import { LOGOPAIGNIO } from "@/config/gameRules";
import {
  logopaignioReducer,
  makeInitialLogopaignioState,
} from "@/games/logopaignio/lib/logopaignioReducer";
import { buildShareText } from "@/games/logopaignio/lib/shareText";
import type { LogopaignioPuzzle } from "@/games/logopaignio/types";

const TARGET: LogopaignioPuzzle = {
  id: "cosmote", brand: "Cosmote", sector: "Τηλεπικοινωνίες",
  accept: ["Cosmote"], markAsset: "/x.svg",
};

describe("buildShareText", () => {
  it("never leaks the brand name or the sector", () => {
    let s = makeInitialLogopaignioState(TARGET);
    s = logopaignioReducer(s, { type: "GUESS", input: "wrong" });
    s = logopaignioReducer(s, { type: "GUESS", input: "Cosmote" });
    const text = buildShareText(s);
    expect(text).not.toContain("Cosmote");
    expect(text).not.toContain("Τηλεπικοινωνίες");
    expect(text).not.toContain("wrong");
  });

  it("renders one cell per guess-slot: 🟦 wrong, 🟩 solved, ⬜ unused", () => {
    let s = makeInitialLogopaignioState(TARGET);
    s = logopaignioReducer(s, { type: "GUESS", input: "wrong" });    // 🟦
    s = logopaignioReducer(s, { type: "GUESS", input: "Cosmote" });  // 🟩
    const row = buildShareText(s).split("\n")[1];
    const cells = [...row];
    expect(cells).toHaveLength(LOGOPAIGNIO.MAX_GUESSES);
    expect(cells[0]).toBe("🟦");
    expect(cells[1]).toBe("🟩");
    expect(cells[2]).toBe("⬜");
  });

  it("ends with the score line", () => {
    const s = logopaignioReducer(makeInitialLogopaignioState(TARGET), { type: "GUESS", input: "Cosmote" });
    expect(buildShareText(s).split("\n").at(-1)).toMatch(/^Σκορ: \d+$/);
  });

  it("has no digits in the guess row (spoiler-free)", () => {
    let s = makeInitialLogopaignioState(TARGET);
    s = logopaignioReducer(s, { type: "GUESS", input: "wrong" });
    expect(buildShareText(s).split("\n")[1]).not.toMatch(/\d/);
  });
});
