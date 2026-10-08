// Moves a model can plan for its fighter in the real-time game.
export const INTENTS = ["approach", "retreat", "punch", "kick", "block", "special"] as const;
export type Intent = (typeof INTENTS)[number];

// Turns one classification (a choice plus odds per move) into a short plan.
// The classifier's pick leads; the rest is drawn from its odds so the fighter
// mixes moves, with no move three times in a row and the special (one per
// power bar) only ever as the lead. Without odds the plan is just the pick.
export function planFromOdds(
  choice: string | undefined,
  odds: Partial<Record<string, number>>,
  specialReady: boolean,
  len: number,
  random = Math.random,
): Intent[] {
  const usable = INTENTS.filter((m) => m !== "special" || specialReady);
  const p = (m: Intent) => odds[m] ?? 0;
  const ranked = [...usable].sort((a, b) => p(b) - p(a));
  const lead = usable.find((m) => m === choice) ?? (p(ranked[0]) > 0 ? ranked[0] : undefined);
  if (!lead) return [];

  const pool = usable.filter((m) => m !== "special" && p(m) > 0);
  const plan: Intent[] = [lead];
  while (plan.length < len) {
    const [a, b] = plan.slice(-2);
    const options = pool.filter((m) => !(m === a && m === b));
    const total = options.reduce((t, m) => t + p(m), 0);
    if (total <= 0) break;
    let r = random() * total;
    plan.push(options.find((m) => (r -= p(m)) < 0) ?? options[options.length - 1]);
  }
  return plan;
}

// No model: used when a model can't answer in time, the budget is spent, the
// player is rate-limited, and by the free PvP practice bot.
export function scriptedPlan(s: { distance: "close" | "mid" | "far"; specialReady: boolean }) {
  const moves: Intent[] =
    s.distance === "far"
      ? ["approach", "kick", "punch", "block", "punch"]
      : s.specialReady
        ? ["special", "block", "kick", "punch", "approach"]
        : ["punch", "kick", "block", "punch", "retreat"];
  return { moves, fallback: "block" as Intent, taunt: "..." };
}
