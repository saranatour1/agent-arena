import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { AIBudget } from "@convex-dev/ai-budget";
import { getAuthUserId } from "@convex-dev/auth/core";
import { components } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";

// Arcade credits: every run costs one heart; hearts refill one per 30 minutes, max 5.
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  hearts: { kind: "token bucket", rate: 1, period: 30 * MINUTE, capacity: 5 },
  // Model plans: two AI fighters, each at most one plan every 4s, with headroom.
  plans: { kind: "token bucket", rate: 90, period: MINUTE, capacity: 30 },
});

export const { getRateLimit: getHearts, getServerTime } = rateLimiter.hookAPI(
  "hearts",
  {
    key: async (ctx) => {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Not signed in");
      return userId;
    },
  },
);

// Every model call goes through the Convex AI Gateway with budget tracking.
export const ai = new AIBudget(components.aiBudget, {
  defaultModel: "anthropic/claude-haiku-5.5",
  defaultEvalModel: "typesafe/jev-1.13",
  onSoftLimit: () => {},
});

export const USER_DAILY_SPEND_NANOS = 1_500_000_000; 
export const GLOBAL_DAILY_SPEND_NANOS = 10_000_000_000; 

export const init = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ai.global.setLimits(ctx, { dailySpendLimitNanos: GLOBAL_DAILY_SPEND_NANOS });
    return null;
  },
});

export const applyUserLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").take(1000);
    for (const p of players) {
      await ai.users.setLimits(ctx, {
        userId: p.userId,
        dailySpendLimitNanos: USER_DAILY_SPEND_NANOS,
      });
    }
    return players.length;
  },
});

export const usage = query({
  args: {},
  handler: async (ctx) => {
    const [fighters, global] = await Promise.all([
      ai.tag("fighter").list(ctx),
      ai.global.status(ctx),
    ]);
    return {
      fighters: fighters.map((b) => ({
        fighterId: b.value,
        spendNanos: b.totalSpendNanos,
        tokens: b.totalTokens,
        requests: b.totalRequests,
      })),
      spentTodayNanos: global.spentTodayNanos,
      spentTotalNanos: global.spentTotalNanos,
      dailyLimitNanos: global.dailySpendLimitNanos,
    };
  },
});
