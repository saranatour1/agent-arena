import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/core";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ROUNDS_TO_WIN } from "./game/fighters";
import { MAX_FRAMES, OPENING, isInputs, replay } from "../src/game/rt/lockstep";

// Online PvP: free (no hearts, no AI). Matchmaking pairs whoever searched in the
// last few seconds; the browsers swap inputs (lockstep) and the server replays
// them to settle the result and the Elo-style PvP rating.

const QUEUE_FRESH_MS = 10_000; // searchers ping every few seconds; older entries have left
const IDLE_FORFEIT_MS = 8_000; // an opponent silent this long can be beaten by forfeit
const ABANDONED_MS = 60_000; // a "live" match nobody has touched this long is over
const START_RATING = 1000;
const K = 32;
const MAX_PUSH = 240;

const vSide = v.union(v.literal(0), v.literal(1));
const vPublicMatch = v.object({
  _id: v.id("pvpMatches"),
  side: vSide,
  names: v.array(v.string()),
  costumes: v.array(v.string()),
  status: v.union(v.literal("live"), v.literal("done")),
  winner: v.optional(vSide),
  endedBy: v.optional(v.union(v.literal("ko"), v.literal("forfeit"), v.literal("abandoned"))),
  ratingChange: v.optional(v.number()),
});

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError("Not signed in");
  return userId;
}

async function latestMatch(ctx: QueryCtx, userId: Id<"users">) {
  const [a, b] = await Promise.all([
    ctx.db.query("pvpMatches").withIndex("by_p0", (q) => q.eq("p0", userId)).order("desc").first(),
    ctx.db.query("pvpMatches").withIndex("by_p1", (q) => q.eq("p1", userId)).order("desc").first(),
  ]);
  if (!a || !b) return a ?? b;
  return a._creationTime > b._creationTime ? a : b;
}

const sideOf = (m: Doc<"pvpMatches">, userId: Id<"users">): 0 | 1 | null =>
  m.p0 === userId ? 0 : m.p1 === userId ? 1 : null;

const inputsOfSide = (ctx: QueryCtx, matchId: Id<"pvpMatches">, side: 0 | 1) =>
  ctx.db
    .query("pvpInputs")
    .withIndex("by_match_side", (q) => q.eq("matchId", matchId).eq("side", side))
    .unique();

async function fighter(ctx: QueryCtx, userId: Id<"users">) {
  const p = await ctx.db
    .query("players")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!p) throw new ConvexError("Pick a fighter name first");
  return p;
}

// Ends a match once: records the winner and moves both PvP ratings (Elo).
async function settle(ctx: MutationCtx, m: Doc<"pvpMatches">, winner: 0 | 1 | null, endedBy: "ko" | "forfeit" | "abandoned") {
  if (m.status === "done") return;
  if (winner === null) {
    await ctx.db.patch("pvpMatches", m._id, { status: "done", endedBy });
    return;
  }
  const [w, l] = await Promise.all([fighter(ctx, winner === 0 ? m.p0 : m.p1), fighter(ctx, winner === 0 ? m.p1 : m.p0)]);
  const rw = w.pvpRating ?? START_RATING;
  const rl = l.pvpRating ?? START_RATING;
  const delta = Math.max(1, Math.round(K * (1 - 1 / (1 + 10 ** ((rl - rw) / 400)))));
  await ctx.db.patch("players", w._id, { pvpRating: rw + delta, pvpWins: (w.pvpWins ?? 0) + 1 });
  await ctx.db.patch("players", l._id, { pvpRating: rl - delta, pvpLosses: (l.pvpLosses ?? 0) + 1 });
  await ctx.db.patch("pvpMatches", m._id, { status: "done", winner, endedBy, ratingChange: delta });
}

// Search (call again every few seconds to stay in the queue). Returns the match
// once paired; the player who was waiting first is side 0.
export const findMatch = mutation({
  args: {},
  returns: v.union(v.object({ matchId: v.id("pvpMatches") }), v.null()),
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const me = await fighter(ctx, userId);
    const now = Date.now();

    const current = await latestMatch(ctx, userId);
    if (current?.status === "live") {
      const sides = await Promise.all([inputsOfSide(ctx, current._id, 0), inputsOfSide(ctx, current._id, 1)]);
      if (sides.some((s) => s && now - s.pushedAt < ABANDONED_MS)) return { matchId: current._id };
      await settle(ctx, current, null, "abandoned");
    }

    const mine = await ctx.db
      .query("pvpQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const waiting = await ctx.db
      .query("pvpQueue")
      .withIndex("by_seenAt", (q) => q.gt("seenAt", now - QUEUE_FRESH_MS))
      .take(20);
    const other = waiting.find((e) => e.userId !== userId);
    if (!other) {
      if (mine) await ctx.db.patch("pvpQueue", mine._id, { seenAt: now });
      else await ctx.db.insert("pvpQueue", { userId, seenAt: now });
      return null;
    }

    await ctx.db.delete("pvpQueue", other._id);
    if (mine) await ctx.db.delete("pvpQueue", mine._id);
    const them = await fighter(ctx, other.userId);
    const matchId = await ctx.db.insert("pvpMatches", {
      p0: other.userId,
      p1: userId,
      names: [them.username, me.username],
      costumes: [them.costume ?? "crimson", me.costume ?? "crimson"],
      status: "live",
    });
    for (const side of [0, 1] as const) await ctx.db.insert("pvpInputs", { matchId, side, chars: OPENING, pushedAt: now });
    return { matchId };
  },
});

export const leaveQueue = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const mine = await ctx.db
      .query("pvpQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (mine) await ctx.db.delete("pvpQueue", mine._id);
    return null;
  },
});

// The caller's most recent PvP match (the waiting player learns they were paired here).
export const myMatch = query({
  args: {},
  returns: v.union(vPublicMatch, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const m = await latestMatch(ctx, userId);
    if (!m) return null;
    return {
      _id: m._id,
      side: sideOf(m, userId)!,
      names: m.names,
      costumes: m.costumes,
      status: m.status,
      winner: m.winner,
      endedBy: m.endedBy,
      ratingChange: m.ratingChange,
    };
  },
});

// The opponent's input stream, for the lockstep loop.
export const opponentInputs = query({
  args: { matchId: v.id("pvpMatches") },
  returns: v.union(v.object({ chars: v.string(), pushedAt: v.number() }), v.null()),
  handler: async (ctx, { matchId }) => {
    const userId = await requireUser(ctx);
    const m = await ctx.db.get("pvpMatches", matchId);
    const side = m && sideOf(m, userId);
    if (side === null || side === undefined) throw new ConvexError("Not your match");
    const doc = await inputsOfSide(ctx, matchId, side === 0 ? 1 : 0);
    return doc && { chars: doc.chars, pushedAt: doc.pushedAt };
  },
});

// Appends the caller's inputs for frames [from, from + chars.length). Overlaps
// from a retried push are trimmed; a gap returns the stored length to resend from.
export const pushInputs = mutation({
  args: { matchId: v.id("pvpMatches"), from: v.number(), chars: v.string() },
  returns: v.number(),
  handler: async (ctx, { matchId, from, chars }) => {
    const userId = await requireUser(ctx);
    const m = await ctx.db.get("pvpMatches", matchId);
    const side = m && sideOf(m, userId);
    if (!m || side === null || side === undefined) throw new ConvexError("Not your match");
    if (!Number.isInteger(from) || from < 0 || chars.length > MAX_PUSH || !isInputs(chars)) {
      throw new ConvexError("Bad inputs");
    }
    const doc = (await inputsOfSide(ctx, matchId, side))!;
    const len = doc.chars.length;
    if (m.status !== "live" || from > len) return len;
    const add = chars.slice(len - from);
    if (add.length === 0) return len;
    if (len + add.length > MAX_FRAMES) throw new ConvexError("Match too long");
    await ctx.db.patch("pvpInputs", doc._id, { chars: doc.chars + add, pushedAt: Date.now() });
    return len + add.length;
  },
});

// Called by either player when their fight ends: the server replays both input
// streams and records the real winner. Returns false while inputs are still in flight.
export const finish = mutation({
  args: { matchId: v.id("pvpMatches") },
  returns: v.boolean(),
  handler: async (ctx, { matchId }) => {
    const userId = await requireUser(ctx);
    const m = await ctx.db.get("pvpMatches", matchId);
    if (!m || sideOf(m, userId) === null) throw new ConvexError("Not your match");
    if (m.status === "done") return true;
    const [a, b] = await Promise.all([inputsOfSide(ctx, matchId, 0), inputsOfSide(ctx, matchId, 1)]);
    const { w } = replay(a?.chars ?? "", b?.chars ?? "", ROUNDS_TO_WIN);
    if (w.winner === null) return false;
    await settle(ctx, m, w.winner, "ko");
    return true;
  },
});

// Leave mid-fight (counts as a loss), or claim the win when the opponent went silent.
export const forfeit = mutation({
  args: { matchId: v.id("pvpMatches") },
  returns: v.null(),
  handler: async (ctx, { matchId }) => {
    const userId = await requireUser(ctx);
    const m = await ctx.db.get("pvpMatches", matchId);
    const side = m && sideOf(m, userId);
    if (!m || side === null || side === undefined) throw new ConvexError("Not your match");
    await settle(ctx, m, side === 0 ? 1 : 0, "forfeit");
    return null;
  },
});

export const claimWin = mutation({
  args: { matchId: v.id("pvpMatches") },
  returns: v.boolean(),
  handler: async (ctx, { matchId }) => {
    const userId = await requireUser(ctx);
    const m = await ctx.db.get("pvpMatches", matchId);
    const side = m && sideOf(m, userId);
    if (!m || side === null || side === undefined) throw new ConvexError("Not your match");
    const them = await inputsOfSide(ctx, matchId, side === 0 ? 1 : 0);
    if (m.status !== "live" || !them || Date.now() - them.pushedAt < IDLE_FORFEIT_MS) return false;
    await settle(ctx, m, side, "forfeit");
    return true;
  },
});

export const leaderboard = query({
  args: {},
  returns: v.array(v.object({ username: v.string(), rating: v.number(), wins: v.number(), losses: v.number() })),
  handler: async (ctx) => {
    const top = await ctx.db.query("players").withIndex("by_pvpRating").order("desc").take(10);
    return top
      .filter((p) => p.pvpRating !== undefined)
      .map((p) => ({ username: p.username, rating: p.pvpRating!, wins: p.pvpWins ?? 0, losses: p.pvpLosses ?? 0 }));
  },
});
