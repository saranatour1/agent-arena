import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {literals} from "convex-helpers/validators"

export const vFighterId = literals("haiku", "sonnet","jev","opus",);

// A side of a match: one of the AI fighters, or the human player.
export const vCombatant = v.union(vFighterId, literals("player"));
const vPair = v.array(v.number()); // [side0, side1]

export const vIntent = v.union(literals("approach","retreat", "punch", "kick", "block", "special"));

export default defineSchema({
  users: defineTable({
    // For testing purposes
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  }).index("by_email", ["email"]),

  // One leaderboard row per human player.
  players: defineTable({
    userId: v.id("users"),
    username: v.string(),
    bestScore: v.number(),
    clears: v.number(), 
    xp: v.optional(v.number()),
    achievements: v.optional(v.array(v.string())),
    costume: v.optional(v.string()),
    timeZone: v.optional(v.string()), 
    pvpRating: v.optional(v.number()), // Elo, starts at 1000
    pvpWins: v.optional(v.number()),
    pvpLosses: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_pvpRating", ["pvpRating"])
    .index("by_bestScore", ["bestScore"]),

  runs: defineTable({
    userId: v.id("users"),
    phase: v.union(literals("gauntlet", "showdown", "done")),
    beaten: v.number(), 
    perfects: v.number(),
    score: v.number(),
    currentMatchId: v.optional(v.id("matches")),
    order: v.optional(v.array(vFighterId)), // this run's gauntlet order
    champion: v.optional(vFighterId),
    xpGained: v.optional(v.number()),
    newAchievements: v.optional(v.array(v.string())), 
    shareImage: v.optional(v.id("_storage")),
    workflowId: v.optional(v.string()),
    day: v.optional(v.string()), 
    engine: v.optional(v.literal("realtime")),
  }).index("by_user", ["userId"]),

  matches: defineTable({
    runId: v.id("runs"),
    kind: v.union(v.literal("gauntlet"), v.literal("showdown")),
    label: v.string(),
    sides: v.array(vCombatant), // [side0, side1]
    hp: vPair, 
    roundWins: vPair,
    winner: v.union(v.number(), v.null()),
    meter: v.optional(v.any()),
    round: v.optional(v.any()),
    turn: v.optional(v.any()),
    lastTurn: v.optional(v.any()),
    history: v.optional(v.any()),
    workflowId: v.optional(v.any()),
    awaitingPlayer: v.optional(v.any()),
    turnDeadline: v.optional(v.any()),
    perfectRounds: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  }).index("by_run", ["runId"]),

  fighterStats: defineTable({
    fighterId: vFighterId,
    wins: v.number(),
    losses: v.number(),
    humanWins: v.number(), 
    humanLosses: v.number(),
  }).index("by_fighter", ["fighterId"]),

  // Online PvP (convex/pvp.ts). Players searching right now; seenAt is a heartbeat.
  pvpQueue: defineTable({
    userId: v.id("users"),
    seenAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_seenAt", ["seenAt"]),

  pvpMatches: defineTable({
    p0: v.id("users"),
    p1: v.id("users"),
    names: v.array(v.string()),
    costumes: v.array(v.string()),
    status: v.union(literals("live", "done")),
    winner: v.optional(v.union(v.literal(0), v.literal(1))),
    endedBy: v.optional(literals("ko", "forfeit", "abandoned")),
    ratingChange: v.optional(v.number()),
  })
    .index("by_p0", ["p0"])
    .index("by_p1", ["p1"]),

  // One row per player per match, so the two players never write the same doc.
  pvpInputs: defineTable({
    matchId: v.id("pvpMatches"),
    side: v.union(v.literal(0), v.literal(1)),
    chars: v.string(), // one input per frame, see src/game/rt/lockstep.ts
    pushedAt: v.number(),
  }).index("by_match_side", ["matchId", "side"]),
});
