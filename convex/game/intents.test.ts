import { describe, expect, test } from "vitest";
import { planFromOdds } from "./intents";

const odds = { approach: 0.05, retreat: 0.05, punch: 0.5, kick: 0.2, block: 0.1, special: 0.1 };

describe("Jev's plan from one classification", () => {
  test("the classifier's pick leads the plan", () => {
    for (let i = 0; i < 50; i++) expect(planFromOdds("kick", odds, true, 6)[0]).toBe("kick");
  });

  test("no move three times in a row, and at most one special, as the lead", () => {
    const lopsided = { approach: 0.97, punch: 0.01, kick: 0.01, special: 0.01 };
    for (let i = 0; i < 200; i++) {
      const plan = planFromOdds("approach", lopsided, true, 6);
      expect(plan).toHaveLength(6);
      plan.forEach((m, k) => k >= 2 && expect(m === plan[k - 1] && m === plan[k - 2]).toBe(false));
      expect(plan.slice(1)).not.toContain("special");
    }
    expect(planFromOdds("special", odds, true, 4)[0]).toBe("special");
  });

  test("a special pick while the power bar is charging falls back to the next-best move", () => {
    const plan = planFromOdds("special", odds, false, 6);
    expect(plan[0]).toBe("punch");
    expect(plan).not.toContain("special");
  });

  test("without odds, the plan is just the pick", () => {
    expect(planFromOdds("block", {}, false, 6)).toEqual(["block"]);
    expect(planFromOdds(undefined, {}, false, 6)).toEqual([]);
  });
});
