import { DateTime } from "luxon";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import { streakMultiplier } from "../../convex/game/progress";

export type Profile = NonNullable<FunctionReturnType<typeof api.game.profile>>;

// Streak days are counted in the player's local time.
export const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export const localToday = () => DateTime.local().toISODate();

export function levelProgress(p: Profile) {
  const span = p.nextLevelXp - p.levelStartXp;
  return { span, into: p.xp - p.levelStartXp, pct: span > 0 ? ((p.xp - p.levelStartXp) / span) * 100 : 0 };
}

export const streakBonusPct = (streak: number) => Math.round((streakMultiplier(streak) - 1) * 100);

export function startRunError(e: unknown) {
  const data = e && typeof e === "object" && "data" in e ? (e).data : null;
  if (data && typeof data === "object" && (data as { kind?: string }).kind === "NoHearts") {
    const s = Math.ceil(((data as { retryAfter?: number }).retryAfter ?? 0) / 1000);
    return s > 0
      ? `Out of hearts. Your next one is ready in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}.`
      : "Out of hearts. One refills every 30 minutes.";
  }
  return typeof data === "string" ? data : "Couldn't start a run. Try again.";
}
