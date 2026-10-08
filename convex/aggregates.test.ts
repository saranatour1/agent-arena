/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import aggregateTest from "@convex-dev/aggregate/test";
import schema from "./schema";
import { runCount, runsByDay, streakOf } from "./aggregates";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-08T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

test("streaks and run counts come from the runsByDay aggregate, in local days", async () => {
  const t = convexTest(schema, modules);
  aggregateTest.register(t, "runsByDay");
  const userId = await t.run((ctx) => ctx.db.insert("users", {}));
  const play = (day: string) =>
    t.run(async (ctx) => {
      const id = await ctx.db.insert("runs", { userId, phase: "done", beaten: 0, perfects: 0, score: 0, day });
      await runsByDay.insert(ctx, (await ctx.db.get("runs", id))!);
    });

  const check = () =>
    t.run(async (ctx) => ({ ...(await streakOf(ctx, userId, "Asia/Tokyo")), runs: await runCount(ctx, userId) }));

  expect(await check()).toEqual({ streak: 0, playedToday: false, runs: 0 });
  await play("2026-10-06");
  await play("2026-10-07");
  // Not played today yet: yesterday's streak is still alive.
  expect(await check()).toEqual({ streak: 2, playedToday: false, runs: 2 });
  await play("2026-10-08");
  await play("2026-10-08");
  expect(await check()).toEqual({ streak: 3, playedToday: true, runs: 4 });
  // A missed day breaks it (Oct 4 is not connected).
  await play("2026-10-04");
  expect((await check()).streak).toBe(3);
});
