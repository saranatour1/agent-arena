import { v } from "convex/values";
import { z } from "zod";
import { Agent } from "@convex-dev/agent";
import { Output } from "ai";
import { action, type ActionCtx } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { ai, rateLimiter } from "./limits";
import { FIGHTERS, type FighterId } from "./game/fighters";
import { vIntent } from "./schema";
import { INTENTS, planFromOdds, scriptedPlan, type Intent } from "./game/intents";
import { getAuthUserId } from "@convex-dev/auth/core";

// ai-budget's model is an AI SDK v7 wrapLanguageModel(), but it's typed as the
// wide `LanguageModel` union that Agent's v7 type guard rejects.
type AgentModel = ConstructorParameters<typeof Agent>[1]["languageModel"];

// The game never waits on a model: each call returns the fighter's next few
// moves plus a fallback, and the client asks again before it runs out.

const RT_RULES = `Real-time 2D fighting game (classic arcade style). Plan your fighter's next moves:
- approach: walk toward the opponent. retreat: back off.
- punch: fast, short range (good up close, interrupts slow kicks).
- kick: slower, longer range, more damage, pushes the opponent back.
- block: hold guard briefly; stops punches and kicks, special does a little chip.
- special: energy blast across the screen; only works when your special is ready.
Mix it up; predictable fighters get blocked.`;

const PLAN_TIMEOUT_MS = 9_000;
// Longer plans mean fewer model calls. Haiku is the most frequent opponent
// (stage 1 and a semifinal), so it plans furthest ahead.
const PLAN_LEN: Record<FighterId, number> = { haiku: 10, sonnet: 6, jev: 6, opus: 6 };
const MAX_PLAN = 12;

const RECENT_LEN = 8;

const vSituation = v.object({
  round: v.number(),
  secondsLeft: v.number(),
  distance: v.union(v.literal("close"), v.literal("mid"), v.literal("far")),
  myHp: v.number(),
  oppHp: v.number(),
  specialReady: v.boolean(),
  oppSpecialReady: v.boolean(),
  myRecent: v.array(vIntent),
  oppRecent: v.array(vIntent),
});
type RtSituation = typeof vSituation.type;
type RtPlan = { moves: Intent[]; fallback: Intent; taunt: string };

const describeSituation = (opponent: string, s: RtSituation, len: number) =>
  `Round ${s.round}, ${s.secondsLeft}s left vs ${opponent}. Distance: ${s.distance}.
Your HP ${s.myHp}, opponent HP ${s.oppHp}. Your special ${s.specialReady ? "is READY" : "is charging"}; theirs ${s.oppSpecialReady ? "is READY" : "is charging"}.
Your recent actions: ${s.myRecent.join(", ") || "none"}. Opponent's recent actions: ${s.oppRecent.join(", ") || "none"}.
Plan your next ${len} moves, a fallback move for if you run out, and a tiny taunt (max 8 words).`;

async function planClaude(
  ctx: ActionCtx,
  userId: string,
  fighterId: FighterId,
  opponent: string,
  s: RtSituation,
  abortSignal: AbortSignal,
): Promise<RtPlan> {
  const f = FIGHTERS[fighterId];
  const agent = new Agent(components.agent, {
    name: f.name,
    instructions: `You are ${f.name}, "${f.title}", a cute arcade fighter. ${f.style}\n${RT_RULES}`,
    languageModel: ai.languageModel(ctx, {
      userId,
      model: f.model,
      tags: [{ dimension: "fighter", value: f.id }],
    }) as AgentModel,
  });
  const { output } = await agent.generateText(
    ctx,
    { userId },
    {
      prompt: describeSituation(opponent, s, PLAN_LEN[fighterId]),
      reasoning: "low",
      abortSignal,
      output: Output.object({
        schema: z.object({
          moves: z.array(z.enum(INTENTS)).min(3).max(MAX_PLAN),
          fallback: z.enum(INTENTS),
          taunt: z.string().max(60),
        }),
      }),
    },
    { storageOptions: { saveMessages: "none" } },
  );
  return output;
}

async function planJev(
  ctx: ActionCtx,
  userId: string,
  opponent: string,
  s: RtSituation,
  abortSignal: AbortSignal,
): Promise<RtPlan> {
  const criteria = {
    approach: "Too far to hit; close the distance",
    retreat: "Opponent's special is ready or I'm being pressured",
    punch: "Close range; fast hit or interrupt",
    kick: "Mid range or opponent keeps blocking low-damage hits",
    block: "Opponent likely to attack right now",
    special: "My special is ready and opponent is open",
  };
  const { answers } = await ai.decisions(ctx, {
    userId,
    tags: [{ dimension: "fighter", value: "jev" }],
    abortSignal,
    state: { rules: RT_RULES, opponent, ...s },
    questions: {
      move: { type: "choice", instructions: "Best move for this fighter over the next few seconds.", criteria },
      fallback: { type: "choice", instructions: "Safest move if the plan runs out.", criteria },
    },
  });
  const odds: Partial<Record<string, number>> = answers.move?.probabilities ?? {};
  const moves = planFromOdds(answers.move?.choice, odds, s.specialReady, PLAN_LEN.jev);
  if (moves.length === 0) throw new Error("Jev gave no plan");
  // The fallback is the classifier's "safest move", unless that's a special that isn't charged.
  const [fallback = "block"] = planFromOdds(answers.fallback?.choice, {}, s.specialReady, 1);
  const sure = odds[moves[0]];
  return {
    moves,
    fallback,
    taunt: sure ? `${Math.round(sure * 1000) / 10}% sure.` : "I calculated this.",
  };
}

export const planMoves = action({
  args: { matchId: v.id("matches"), side: v.union(v.literal(0), v.literal(1)), situation: vSituation },
  returns: v.object({
    moves: v.array(vIntent),
    fallback: vIntent,
    taunt: v.string(),
    thinkMs: v.number(),
  }),
  handler: async (ctx, { matchId, side, situation }): Promise<RtPlan & { thinkMs: number }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    const info: { fighterId: FighterId; opponent: string } | null = await ctx.runQuery(
      internal.game.planContext,
      { matchId, side, userId },
    );
    if (info === null) throw new Error("Not an AI side of your current match");
    const s = {
      ...situation,
      myRecent: situation.myRecent.slice(-RECENT_LEN),
      oppRecent: situation.oppRecent.slice(-RECENT_LEN),
    };
    const startedAt = Date.now();
    const scripted = () => ({ ...scriptedPlan(s), thinkMs: Date.now() - startedAt });

    if (!(await rateLimiter.limit(ctx, "plans", { key: userId })).ok) return scripted();
    const abortSignal = AbortSignal.timeout(PLAN_TIMEOUT_MS);
    try {
      const plan: RtPlan =
        FIGHTERS[info.fighterId].kind === "jev"
          ? await planJev(ctx, userId, info.opponent, s, abortSignal)
          : await planClaude(ctx, userId, info.fighterId, info.opponent, s, abortSignal);
      const thinkMs = Date.now() - startedAt;
      console.log(`plan ${info.fighterId} [${plan.moves.join(",")}] fb=${plan.fallback} in ${thinkMs}ms`);
      return { moves: plan.moves.slice(0, MAX_PLAN), fallback: plan.fallback, taunt: plan.taunt.slice(0, 60), thinkMs };
    } catch (e) {
      console.warn(`plan fallback for ${info.fighterId}:`, String(e));
      return scripted();
    }
  },
});
