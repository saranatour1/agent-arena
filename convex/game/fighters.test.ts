import { expect, test } from "vitest";
import { GAUNTLET, shuffledAgents } from "./fighters";

test("every run meets all four agents, in a shuffled order", () => {
  const orders = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const order = shuffledAgents();
    expect([...order].sort()).toEqual([...GAUNTLET].sort());
    orders.add(order.join());
  }
  expect(orders.size).toBeGreaterThan(10); // 24 possible orders
});
