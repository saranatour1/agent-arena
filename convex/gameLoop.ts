import { v } from "convex/values";
import { defineWorkflow } from "@convex-dev/workflow";
import { components, internal } from "./_generated/api";
import { matchResultEvent } from "./game";
import { FIGHTERS, GAUNTLET, type FighterId } from "./game/fighters";
import { vFighterId } from "./schema";

// Bookkeeping steps run inline in the workflow's transaction. convex-test can't
// execute inline steps, so tests set globalThis.__INLINE_STEPS__ = false.
const inline = (
  (globalThis as { __INLINE_STEPS__?: boolean }).__INLINE_STEPS__ === false ? {} : { inline: true }
) as { inline: true };

// One run. Matches are played live in the browser (60fps, models plan ahead);
// the workflow sequences the run and waits for each match's reported result:
// the gauntlet (player vs each agent until the player is out), then, unless
// the player beat everyone, the agents' showdown bracket and its champion.
export const runGame = defineWorkflow(components.workflow, {
  // `order` is shuffled by startRun (workflows replay, so they can't roll dice);
  // runs started before random order existed fall back to the fixed roster.
  args: { runId: v.id("runs"), order: v.optional(v.array(vFighterId)) },
}).handler(async (step, { runId, order }): Promise<void> => {
  for (const opponent of order ?? GAUNTLET) {
    const matchId = await step.runMutation(
      internal.game.createMatch,
      { runId, kind: "gauntlet", label: `YOU vs ${FIGHTERS[opponent].name}`, sides: ["player", opponent] },
      inline,
    );
    await step.awaitEvent({ name: matchResultEvent(matchId) });
    const fightsOn = await step.runMutation(internal.game.afterGauntletMatch, { runId, matchId }, inline);
    if (!fightsOn) break;
  }

  const semis = await step.runMutation(internal.game.endGauntlet, { runId }, inline);
  if (!semis) return;

  const liveMatch = async (label: string, a: FighterId, b: FighterId) => {
    const matchId = await step.runMutation(
      internal.game.createMatch,
      { runId, kind: "showdown", label, sides: [a, b] },
      inline,
    );
    await step.awaitEvent({ name: matchResultEvent(matchId) });
    return await step.runMutation(internal.game.recordShowdownMatch, { matchId }, inline);
  };
  const finalists: FighterId[] = [];
  for (const [i, [a, b]] of semis.entries()) finalists.push(await liveMatch(`SEMIFINAL ${i + 1}`, a, b));
  const champion = await liveMatch("GRAND FINAL", finalists[0], finalists[1]);
  await step.runMutation(internal.game.finishRun, { runId, champion }, inline);
});
