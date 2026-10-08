import { describe, expect, test } from "vitest";
import { levelFor, runXp, streakMultiplier, titleFor, xpForLevel } from "./progress";

describe("progression", () => {
  test("levels follow the XP curve", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(xpForLevel(2))).toBe(2);
    expect(levelFor(xpForLevel(5) - 1)).toBe(4);
    expect(titleFor(1)).toBe("Rookie");
    expect(titleFor(8)).toBe("Champion");
  });

  test("streak boosts XP, capped at +50%", () => {
    expect(streakMultiplier(1)).toBe(1);
    expect(streakMultiplier(3)).toBeCloseTo(1.2);
    expect(streakMultiplier(30)).toBe(1.5);
    expect(runXp(2, 1, 1)).toBe(50 + 240 + 60);
    expect(runXp(2, 1, 6)).toBe(Math.round(350 * 1.5));
  });
});
