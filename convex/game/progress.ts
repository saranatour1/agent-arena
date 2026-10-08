// Meta-progression: XP & levels, daily streaks, achievements and costumes.
// Pure helpers shared by the backend (awarding) and the client (display).
import type { FighterId } from "./fighters";

export type AchievementId =
  | "first_win"
  | "flawless"
  | "beat_haiku"
  | "beat_sonnet"
  | "beat_jev"
  | "beat_opus"
  | "full_clear"
  | "speedrun"
  | "comeback"
  | "plot_twist"
  | "streak_3"
  | "streak_7"
  | "regular";

export const ACHIEVEMENTS: Record<AchievementId, { name: string; desc: string; icon: string }> = {
  first_win: { name: "First Blood", desc: "Win your first match", icon: "🩸" },
  flawless: { name: "Perfect Round", desc: "Win a round without taking damage", icon: "💎" },
  beat_haiku: { name: "Verse Breaker", desc: "Defeat Haiku", icon: "🌸" },
  beat_sonnet: { name: "End of the Sonnet", desc: "Defeat Sonnet", icon: "🪶" },
  beat_jev: { name: "Beat the Odds", desc: "Defeat Jev", icon: "🎲" },
  beat_opus: { name: "Dethroned", desc: "Defeat Opus, the final boss", icon: "👑" },
  full_clear: { name: "Gauntlet Master", desc: "Beat all four agents in one run", icon: "🏆" },
  speedrun: { name: "Lightning Fist", desc: "Win a match in under 35 seconds", icon: "⚡" },
  comeback: { name: "Comeback Kid", desc: "Win a match with under 15 HP left", icon: "🔥" },
  plot_twist: { name: "Plot Twist", desc: "Witness Sonnet summon Haiku sub-agents", icon: "🎭" },
  streak_3: { name: "On a Roll", desc: "Play 3 days in a row", icon: "📅" },
  streak_7: { name: "Dedicated", desc: "Play 7 days in a row", icon: "🗓️" },
  regular: { name: "Arcade Regular", desc: "Play 10 runs", icon: "🕹️" },
};
export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];

export const beatAchievement: Record<FighterId, AchievementId> = {
  haiku: "beat_haiku",
  sonnet: "beat_sonnet",
  jev: "beat_jev",
  opus: "beat_opus",
};

const XP_CURVE = 150;
export const levelFor = (xp: number) => Math.floor(Math.sqrt(xp / XP_CURVE)) + 1;
export const xpForLevel = (level: number) => XP_CURVE * (level - 1) ** 2;

export const TITLES: [number, string][] = [
  [1, "Rookie"],
  [3, "Brawler"],
  [5, "Contender"],
  [8, "Champion"],
  [12, "Legend"],
];
export const titleFor = (level: number) => [...TITLES].reverse().find(([l]) => level >= l)![1];

// Streak bonus: +10% XP per consecutive day, up to +50%.
export const streakMultiplier = (streak: number) => 1 + Math.min(0.5, Math.max(0, streak - 1) * 0.1);

export function runXp(beaten: number, perfects: number, streak: number) {
  const base = 50 + 120 * beaten + 60 * perfects;
  return Math.round(base * streakMultiplier(streak));
}

export const COSTUMES = {
  crimson: { name: "Crimson Gi", level: 1 },
  midnight: { name: "Midnight", level: 3 },
  jade: { name: "Jade Dragon", level: 5 },
  gold: { name: "Golden God", level: 8 },
  void: { name: "Void Walker", level: 12 },
} as const;
export type CostumeId = keyof typeof COSTUMES;
export const COSTUME_IDS = Object.keys(COSTUMES) as CostumeId[];
