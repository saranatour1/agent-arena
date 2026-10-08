import { TableAggregate } from "@convex-dev/aggregate";
import { DateTime, IANAZone } from "luxon";
import { components } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

// Every run, grouped by player and sorted by the player's local calendar day.
// Run counts, "played today" and daily streaks are all range counts over this.
export const runsByDay = new TableAggregate<{
  Namespace: Id<"users">;
  Key: string; // YYYY-MM-DD in the player's time zone
  DataModel: DataModel;
  TableName: "runs";
}>(components.runsByDay, {
  namespace: (run) => run.userId,
  sortKey: (run) => run.day ?? DateTime.fromMillis(run._creationTime, { zone: "utc" }).toISODate()!,
});

const MAX_STREAK_DAYS = 365;
const BATCH_DAYS = 60;

export const safeZone = (timeZone: string | undefined) =>
  timeZone && IANAZone.isValidZone(timeZone) ? timeZone : "utc";

export const localDay = (timeZone: string | undefined, now = Date.now()) =>
  DateTime.fromMillis(now, { zone: safeZone(timeZone) }).toISODate()!;

export function runCount(ctx: QueryCtx, userId: Id<"users">) {
  return runsByDay.count(ctx, { namespace: userId });
}

export function runCounts(ctx: QueryCtx, userIds: Id<"users">[]) {
  return userIds.length ? runsByDay.countBatch(ctx, userIds.map((namespace) => ({ namespace }))) : Promise.resolve([]);
}

// Consecutive local days (ending today, or yesterday if today isn't played yet)
// with at least one run. Queries pass the client's `today` so cached results
// don't go stale across midnight.
export async function streakOf(ctx: QueryCtx, userId: Id<"users">, timeZone: string | undefined, todayIso?: string) {
  const zone = safeZone(timeZone);
  const parsed = todayIso ? DateTime.fromISO(todayIso, { zone }) : null;
  const today = (parsed?.isValid ? parsed : DateTime.fromMillis(Date.now(), { zone })).startOf("day");
  const days = (from: DateTime, n: number) => Array.from({ length: n }, (_, i) => from.minus({ days: i }).toISODate()!);
  const counts = (keys: string[]) =>
    runsByDay.countBatch(
      ctx,
      keys.map((key) => ({
        namespace: userId,
        bounds: { lower: { key, inclusive: true }, upper: { key, inclusive: true } },
      })),
    );

  const [playedToday] = await counts([today.toISODate()!]);
  let streak = playedToday > 0 ? 1 : 0;
  let cursor = today.minus({ days: 1 });
  while (streak < MAX_STREAK_DAYS) {
    const batch = await counts(days(cursor, BATCH_DAYS));
    const run = batch.findIndex((n) => n === 0);
    streak += run === -1 ? BATCH_DAYS : run;
    if (run !== -1) break;
    cursor = cursor.minus({ days: BATCH_DAYS });
  }
  return { streak, playedToday: playedToday > 0 };
}
