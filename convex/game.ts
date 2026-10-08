import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/core";
import { cancel, sendEvent, start, type WorkflowId } from "@convex-dev/workflow";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { vCombatant, vFighterId } from "./schema";
import { FIGHTERS, FIGHTER_IDS, ROUNDS_TO_WIN, shuffledAgents, summonerSide, type FighterId } from "./game/fighters";
import { ai, rateLimiter, USER_DAILY_SPEND_NANOS } from "./limits";
import { localDay, runCount, runCounts, runsByDay, safeZone, streakOf } from "./aggregates";
import {
  COSTUMES,
  beatAchievement,
  levelFor,
  runXp,
  titleFor,
  xpForLevel,
  type AchievementId,
  type CostumeId,
} from "./game/progress";

export const POINTS_PER_WIN = 1000;
export const POINTS_PER_PERFECT = 250;

async function requireUser(ctx: { auth: MutationCtx["auth"] }) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError("Not signed in");
  return userId;
}

async function bumpFighter(
  ctx: MutationCtx,
  fighterId: FighterId,
  delta: Partial<Record<"wins" | "losses" | "humanWins" | "humanLosses", number>>,
) {
  const row = await ctx.db
    .query("fighterStats")
    .withIndex("by_fighter", (q) => q.eq("fighterId", fighterId))
    .unique();
  const base = row ?? { wins: 0, losses: 0, humanWins: 0, humanLosses: 0 };
  const next = {
    wins: base.wins + (delta.wins ?? 0),
    losses: base.losses + (delta.losses ?? 0),
    humanWins: base.humanWins + (delta.humanWins ?? 0),
    humanLosses: base.humanLosses + (delta.humanLosses ?? 0),
  };
  if (row) await ctx.db.patch("fighterStats", row._id, next);
  else await ctx.db.insert("fighterStats", { fighterId, ...next });
}

// Idempotent; records which achievements are new this run for the results screen.
async function unlock(ctx: MutationCtx, run: Doc<"runs">, ids: AchievementId[]) {
  const player = await ctx.db
    .query("players")
    .withIndex("by_user", (q) => q.eq("userId", run.userId))
    .unique();
  if (!player || ids.length === 0) return;
  const have = new Set(player.achievements ?? []);
  const fresh = ids.filter((id) => !have.has(id));
  if (fresh.length === 0) return;
  await ctx.db.patch("players", player._id, { achievements: [...have, ...fresh] });
  const latest = await ctx.db.get("runs", run._id);
  await ctx.db.patch("runs", run._id, { newAchievements: [...(latest?.newAchievements ?? []), ...fresh] });
}

export const startRun = mutation({
  args: { timeZone: v.optional(v.string()) },
  returns: v.id("runs"),
  handler: async (ctx, { timeZone }) => {
    const userId = await requireUser(ctx);
    const username = await ctx.runQuery(components.authUsername.public.getUsername, {
      userId,
    });
    if (username === null) throw new ConvexError("Pick a fighter name first");

    // An unfinished run resumes instead of costing another heart.
    const latest = await ctx.db
      .query("runs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    if (latest && latest.phase !== "done") return latest._id;

    const heart = await rateLimiter.limit(ctx, "hearts", { key: userId });
    if (!heart.ok) {
      throw new ConvexError({ kind: "NoHearts", retryAfter: heart.retryAfter });
    }

    const zone = safeZone(timeZone);
    const player = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (player) {
      await ctx.db.patch("players", player._id, { username, timeZone: zone });
    } else {
      await ctx.db.insert("players", { userId, username, bestScore: 0, clears: 0, xp: 0, achievements: [], timeZone: zone });
      await ai.users.setLimits(ctx, { userId, dailySpendLimitNanos: USER_DAILY_SPEND_NANOS });
    }

    const order = shuffledAgents();
    const runId = await ctx.db.insert("runs", {
      userId,
      phase: "gauntlet",
      beaten: 0,
      perfects: 0,
      score: 0,
      day: localDay(zone),
      order,
    });
    const run = (await ctx.db.get("runs", runId))!;
    await runsByDay.insert(ctx, run);
    const workflowId = await start(ctx, internal.gameLoop.runGame, { runId, order });
    await ctx.db.patch("runs", runId, { workflowId });

    const [{ streak }, runs] = await Promise.all([streakOf(ctx, userId, zone), runCount(ctx, userId)]);
    await unlock(ctx, run, [
      ...(streak >= 3 ? (["streak_3"] as const) : []),
      ...(streak >= 7 ? (["streak_7"] as const) : []),
      ...(runs >= 10 ? (["regular"] as const) : []),
    ]);
    return runId;
  },
});

export const MIN_MATCH_MS = 4_000;
export const matchResultEvent = (matchId: string) => `matchResult:${matchId}`;

const isCount = (n: number, max: number) => Number.isInteger(n) && n >= 0 && n <= max;

// The browser plays the match and reports the result; the run's workflow waits
// for this event. Results are client-reported, so only plausibility is checked.
export const reportMatch = mutation({
  args: {
    matchId: v.id("matches"),
    winner: v.number(),
    roundWins: v.array(v.number()),
    hp: v.array(v.number()),
    perfectRounds: v.number(),
    durationMs: v.number(),
    summoned: v.optional(v.boolean()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const match = await ctx.db.get("matches", args.matchId);
    if (!match) throw new ConvexError("No such match");
    const run = await ctx.db.get("runs", match.runId);
    if (!run || run.userId !== userId) throw new ConvexError("Not your fight");
    if (run.phase === "done" || run.currentMatchId !== match._id || match.winner !== null) return false;
    if (
      (args.winner !== 0 && args.winner !== 1) ||
      args.roundWins.length !== 2 ||
      args.roundWins[args.winner] !== ROUNDS_TO_WIN ||
      args.roundWins[1 - args.winner] !== 0 ||
      args.hp.length !== 2 ||
      !args.hp.every((h) => isCount(h, 100)) ||
      !isCount(args.perfectRounds, ROUNDS_TO_WIN) ||
      !Number.isFinite(args.durationMs) ||
      args.durationMs < MIN_MATCH_MS
    ) {
      throw new ConvexError("Implausible match result");
    }
    await ctx.db.patch("matches", match._id, {
      winner: args.winner,
      roundWins: args.roundWins,
      hp: args.hp,
      perfectRounds: match.sides[args.winner] === "player" ? args.perfectRounds : 0,
      durationMs: args.durationMs,
    });
    const playerSide = match.sides.indexOf("player");
    const earned: AchievementId[] = [];
    if (playerSide >= 0 && args.winner === playerSide) {
      earned.push("first_win", beatAchievement[match.sides[1 - playerSide] as FighterId]);
      if (args.perfectRounds > 0) earned.push("flawless");
      if (args.durationMs < 35_000) earned.push("speedrun");
      if ((args.hp[playerSide] ?? 100) < 15) earned.push("comeback");
    }
    if (args.summoned && summonerSide(match.sides) !== null) earned.push("plot_twist");
    await unlock(ctx, run, earned);

    await sendEvent(ctx, components.workflow, {
      workflowId: run.workflowId as WorkflowId,
      name: matchResultEvent(match._id),
    });
    return true;
  },
});

// Also rescues a run whose workflow got stuck.
export const forfeitRun = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const run = await ctx.db
      .query("runs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    if (!run || run.phase === "done") return null;
    if (run.workflowId) {
      try {
        await cancel(ctx, components.workflow, run.workflowId as WorkflowId);
      } catch {
        // already finished or failed
      }
    }
    await ctx.db.patch("runs", run._id, { phase: "done" });
    return null;
  },
});

export const profile = query({
  args: { today: v.optional(v.string()) },
  handler: async (ctx, { today }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const p = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const xp = p?.xp ?? 0;
    const level = levelFor(xp);
    const [{ streak, playedToday }, runs] = await Promise.all([
      streakOf(ctx, userId, p?.timeZone, today),
      runCount(ctx, userId),
    ]);
    return {
      xp,
      level,
      title: titleFor(level),
      levelStartXp: xpForLevel(level),
      nextLevelXp: xpForLevel(level + 1),
      streak,
      playedToday,
      achievements: p?.achievements ?? [],
      costume: (p?.costume ?? "crimson") as CostumeId,
      runs,
      bestScore: p?.bestScore ?? 0,
    };
  },
});

export const setCostume = mutation({
  args: { costume: v.string() },
  returns: v.null(),
  handler: async (ctx, { costume }) => {
    const userId = await requireUser(ctx);
    const p = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!p) throw new ConvexError("Play a run first");
    if (!Object.prototype.hasOwnProperty.call(COSTUMES, costume)) throw new ConvexError("Unknown costume");
    const c = COSTUMES[costume as CostumeId];
    if (levelFor(p.xp ?? 0) < c.level) throw new ConvexError(`Unlocks at level ${c.level}`);
    await ctx.db.patch("players", p._id, { costume });
    return null;
  },
});

export const myRun = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const run = await ctx.db
      .query("runs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    if (!run) return null;
    const match = run.currentMatchId ? await ctx.db.get("matches", run.currentMatchId) : null;
    return { run, match };
  },
});

export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_bestScore")
      .order("desc")
      .take(20);
    const stats = await ctx.db.query("fighterStats").take(FIGHTER_IDS.length);
    const fighters = FIGHTER_IDS.map((id) => {
      const row = stats.find((r) => r.fighterId === id);
      return {
        fighterId: id,
        wins: row?.wins ?? 0,
        losses: row?.losses ?? 0,
        humanWins: row?.humanWins ?? 0,
        humanLosses: row?.humanLosses ?? 0,
      };
    });
    const runs = await runCounts(ctx, players.map((p) => p.userId));
    return {
      players: players.map((p, i) => ({
        username: p.username,
        bestScore: p.bestScore,
        runs: runs[i],
        clears: p.clears,
      })),
      fighters,
    };
  },
});

export const createMatch = internalMutation({
  args: {
    runId: v.id("runs"),
    kind: v.union(v.literal("gauntlet"), v.literal("showdown")),
    label: v.string(),
    sides: v.array(vCombatant),
  },
  returns: v.id("matches"),
  handler: async (ctx, { runId, kind, label, sides }) => {
    const matchId = await ctx.db.insert("matches", {
      runId,
      kind,
      label,
      sides,
      hp: [100, 100],
      roundWins: [0, 0],
      winner: null,
    });
    await ctx.db.patch("runs", runId, { currentMatchId: matchId });
    return matchId;
  },
});

// After a gauntlet match: score it and say whether the player fights on.
export const afterGauntletMatch = internalMutation({
  args: { runId: v.id("runs"), matchId: v.id("matches") },
  returns: v.boolean(),
  handler: async (ctx, { runId, matchId }) => {
    const [run, match] = await Promise.all([ctx.db.get("runs", runId), ctx.db.get("matches", matchId)]);
    if (!run || !match) throw new Error("missing run/match");
    const playerSide = match.sides.indexOf("player");
    const opponent = match.sides[1 - playerSide] as FighterId;
    const playerWon = match.winner === playerSide;
    if (!playerWon) {
      await bumpFighter(ctx, opponent, { wins: 1, humanWins: 1 });
      return false;
    }
    await bumpFighter(ctx, opponent, { losses: 1, humanLosses: 1 });
    const perfect = match.perfectRounds ?? 0;
    const beaten = run.beaten + 1;
    const perfects = run.perfects + perfect;
    await ctx.db.patch("runs", runId, {
      beaten,
      perfects,
      score: beaten * POINTS_PER_WIN + perfects * POINTS_PER_PERFECT,
    });
    return true;
  },
});

// Grants the run's XP. A full clear crowns the player and ends the run (null);
// otherwise returns a freshly shuffled showdown bracket: [[a, b], [c, d]].
export const endGauntlet = internalMutation({
  args: { runId: v.id("runs") },
  returns: v.union(v.null(), v.array(v.array(vFighterId))),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get("runs", runId);
    if (!run) throw new Error("run missing");
    const cleared = run.beaten === FIGHTER_IDS.length;
    await ctx.db.patch("runs", runId, { phase: cleared ? "done" : "showdown" });
    const player = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", run.userId))
      .unique();
    if (player) {
      const { streak } = await streakOf(ctx, run.userId, player.timeZone);
      const xpGained = runXp(run.beaten, run.perfects, streak);
      await ctx.db.patch("players", player._id, {
        bestScore: Math.max(player.bestScore, run.score),
        clears: player.clears + (cleared ? 1 : 0),
        xp: (player.xp ?? 0) + xpGained,
      });
      await ctx.db.patch("runs", runId, { xpGained });
      if (cleared) await unlock(ctx, run, ["full_clear"]);
    }
    if (cleared) return null;
    const [a, b, c, d] = shuffledAgents();
    return [
      [a, b],
      [c, d],
    ];
  },
});

export const recordShowdownMatch = internalMutation({
  args: { matchId: v.id("matches") },
  returns: vFighterId,
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get("matches", matchId);
    if (!match || match.winner === null) throw new Error("match not finished");
    const winner = match.sides[match.winner] as FighterId;
    const loser = match.sides[1 - match.winner] as FighterId;
    await bumpFighter(ctx, winner, { wins: 1 });
    await bumpFighter(ctx, loser, { losses: 1 });
    return winner;
  },
});

export const finishRun = internalMutation({
  args: { runId: v.id("runs"), champion: vFighterId },
  returns: v.null(),
  handler: async (ctx, { runId, champion }) => {
    await ctx.db.patch("runs", runId, { phase: "done", champion });
    return null;
  },
});

// Authorizes a plan request: the caller's current match, an AI side, still live.
export const planContext = internalQuery({
  args: { matchId: v.id("matches"), side: v.number(), userId: v.string() },
  handler: async (ctx, { matchId, side, userId }) => {
    const match = await ctx.db.get("matches", matchId);
    if (!match || match.winner !== null) return null;
    const run = await ctx.db.get("runs", match.runId);
    if (!run || run.phase === "done" || run.userId !== userId || run.currentMatchId !== matchId) return null;
    const me = match.sides[side];
    const opp = match.sides[1 - side];
    if (!me || me === "player") return null;
    return {
      fighterId: me,
      opponent: opp === "player" ? "a human challenger" : FIGHTERS[opp].name,
    };
  },
});
