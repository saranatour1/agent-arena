import { internalMutation } from "./_generated/server";
import { runsByDay } from "./aggregates";

// One-off: index runs created before the runsByDay aggregate existed.
// `npx convex run migrations:backfillRunsByDay` (add --prod for production).
export const backfillRunsByDay = internalMutation({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db.query("runs").take(5000);
    for (const run of runs) await runsByDay.insertIfDoesNotExist(ctx, run);
    return { runs: runs.length };
  },
});
