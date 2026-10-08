/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import workflowTest from "@convex-dev/workflow/test";
import aggregateTest from "@convex-dev/aggregate/test";
import { start } from "@convex-dev/workflow";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");
(globalThis as { __INLINE_STEPS__?: boolean }).__INLINE_STEPS__ = false;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function setupRun() {
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  aggregateTest.register(t, "runsByDay");
  const userId = await t.run((ctx) => ctx.db.insert("users", {}));
  await t.run((ctx) =>
    ctx.db.insert("players", { userId, username: "TESTER", bestScore: 0, clears: 0, xp: 0, achievements: [] }),
  );
  const runId = await t.run((ctx) =>
    ctx.db.insert("runs", { userId, phase: "gauntlet", beaten: 0, perfects: 0, score: 0, engine: "realtime" }),
  );
  await t.run(async (ctx) => {
    const workflowId = await start(ctx, internal.gameLoop.runGame, { runId });
    await ctx.db.patch("runs", runId, { workflowId });
  });
  const settle = () => t.finishAllScheduledFunctions(vi.runAllTimers);
  await settle();
  const current = async () => {
    const run = (await t.run((ctx) => ctx.db.get("runs", runId)))!;
    const match = run.currentMatchId ? await t.run((ctx) => ctx.db.get("matches", run.currentMatchId!)) : null;
    return { run, match };
  };
  return { t, as: t.withIdentity({ subject: userId }), userId, runId, settle, current };
}

const win = (matchId: Id<"matches">, winner: number, roundWins: number[], perfectRounds = 0) => ({
  matchId,
  winner,
  roundWins,
  hp: [50, 0],
  perfectRounds,
  durationMs: 40_000,
});

describe("real-time run (workflow waits on reported results)", () => {
  test("gauntlet → player out → showdown bracket → champion", async () => {
    const { as, settle, current } = await setupRun();

    const { match } = await current();
    expect(match?.sides).toEqual(["player", "haiku"]);

    // Beat Haiku with a flawless round.
    expect(await as.mutation(api.game.reportMatch, win(match!._id, 0, [1, 0], 1))).toBe(true);
    // A duplicate report is ignored.
    expect(await as.mutation(api.game.reportMatch, win(match!._id, 0, [1, 0], 1))).toBe(false);
    await settle();
    let state = await current();
    expect(state.run.beaten).toBe(1);
    expect(state.run.perfects).toBe(1);
    expect(state.match?.sides).toEqual(["player", "sonnet"]);

    expect(state.run.newAchievements).toEqual(expect.arrayContaining(["first_win", "beat_haiku", "flawless"]));

    // Lose to Sonnet → the shuffled showdown bracket starts, and XP lands.
    await as.mutation(api.game.reportMatch, win(state.match!._id, 1, [0, 1]));
    await settle();
    state = await current();
    expect(state.run.phase).toBe("showdown");
    expect(state.run.xpGained).toBeGreaterThan(0);

    // Whatever the bracket: Sonnet wins every match it's in, else Opus, else side 0.
    // So Sonnet meets Opus in a semifinal or the final, and summons there.
    const labels: string[] = [];
    const fighters: string[] = [];
    while (state.run.phase === "showdown") {
      const sides = state.match!.sides as string[];
      labels.push(state.match!.label);
      fighters.push(...sides);
      const winner = sides.includes("sonnet") ? sides.indexOf("sonnet") : Math.max(0, sides.indexOf("opus"));
      const summoned = sides.includes("sonnet") && sides.includes("opus");
      await as.mutation(api.game.reportMatch, { ...win(state.match!._id, winner, winner ? [0, 1] : [1, 0]), summoned });
      await settle();
      state = await current();
    }
    expect(labels).toEqual(["SEMIFINAL 1", "SEMIFINAL 2", "GRAND FINAL"]);
    expect([...new Set(fighters.slice(0, 4))].sort()).toEqual(["haiku", "jev", "opus", "sonnet"]); // each in one semi
    expect(state.run.phase).toBe("done");
    expect(state.run.champion).toBe("sonnet");
    expect(state.run.newAchievements).toContain("plot_twist");
  });

  test("a full clear crowns the player and skips the showdown", async () => {
    const { t, as, userId, settle, current } = await setupRun();
    for (const opponent of ["haiku", "sonnet", "jev", "opus"]) {
      const { match } = await current();
      expect(match?.sides).toEqual(["player", opponent]);
      await as.mutation(api.game.reportMatch, win(match!._id, 0, [1, 0]));
      await settle();
    }
    const { run, match } = await current();
    expect(run.phase).toBe("done");
    expect(run.champion).toBeUndefined();
    expect(match?.sides).toEqual(["player", "opus"]);
    expect(run.newAchievements).toContain("full_clear");
    const player = await t.run((ctx) => ctx.db.query("players").withIndex("by_user", (q) => q.eq("userId", userId)).unique());
    expect(player?.clears).toBe(1);
  });

  test("implausible or foreign results are rejected", async () => {
    const { t, as, current } = await setupRun();
    const { match } = await current();
    await expect(as.mutation(api.game.reportMatch, win(match!._id, 0, [2, 1]))).rejects.toThrow(); // one round only
    await expect(
      as.mutation(api.game.reportMatch, { ...win(match!._id, 0, [1, 0]), durationMs: 500 }),
    ).rejects.toThrow(); // too fast
    const stranger = await t.run((ctx) => ctx.db.insert("users", {}));
    await expect(
      t.withIdentity({ subject: stranger }).mutation(api.game.reportMatch, win(match!._id, 0, [1, 0])),
    ).rejects.toThrow();
  });
});
