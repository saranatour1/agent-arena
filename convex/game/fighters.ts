export const FIGHTER_IDS = ["haiku", "sonnet", "jev", "opus"] as const;
export type FighterId = (typeof FIGHTER_IDS)[number];

export type Fighter = {
  id: FighterId;
  name: string;
  title: string;
  clan: string;
  color: string; // signature color (UI accents)
  accent: string;
  model: string; // Convex AI Gateway model id
  kind: "claude" | "jev";
  catchphrase: string;
  special: string; // shouted when their special lands
  bio: string;
  style: string; // personality fed to the model
};

// The three Claude fighters are one clan, named after poem forms and marked by
// the clan's terracotta sash. Jev is the outsider from TypeSafe.
export const FIGHTERS: Record<FighterId, Fighter> = {
  haiku: {
    id: "haiku",
    name: "HAIKU",
    title: "The Swift Verse",
    clan: "Claude Clan",
    color: "#38e1ff",
    accent: "#0a6b8a",
    model: "anthropic/claude-haiku-5.5",
    kind: "claude",
    catchphrase: "Five, seven, five — K.O.",
    special: "SEVENTEEN-SYLLABLE STRIKE",
    bio: "The clan's youngest. A cyan-hooded ninja who says everything in three short beats and hits just as fast.",
    style: "Quick and scrappy. Loves fast punches and rarely blocks. Speaks in clipped, haiku-like taunts.",
  },
  sonnet: {
    id: "sonnet",
    name: "SONNET",
    title: "The Balanced Blade",
    clan: "Claude Clan",
    color: "#ff9a3c",
    accent: "#8a3f00",
    model: "anthropic/claude-sonnet-5.5",
    kind: "claude",
    catchphrase: "Fourteen lines of pain.",
    special: "THE VOLTA",
    bio: "A duelist-poet in a terracotta doublet and ruff. Waits for the turn in the fight — the volta — then flips it.",
    style: "Balanced and adaptive. Reads the opponent's habits and counters them. Taunts with a poet's flourish.",
  },
  jev: {
    id: "jev",
    name: "JEV",
    title: "The Probability Ninja",
    clan: "TypeSafe Syndicate",
    color: "#5dff7a",
    accent: "#11702a",
    model: "typesafe/jev-1.13",
    kind: "jev",
    catchphrase: "I calculated this.",
    special: "99.7% CERTAINTY",
    bio: "A visored cyber-ninja who never guesses. Every strike is the highest-probability move on the board.",
    style: "Cold and statistical. Picks the move most likely to win this exchange.",
  },
  opus: {
    id: "opus",
    name: "OPUS",
    title: "The Final Boss",
    clan: "Claude Clan",
    color: "#b77dff",
    accent: "#4b1a8a",
    model: "anthropic/claude-opus-5.5",
    kind: "claude",
    catchphrase: "This is my magnum opus.",
    special: "MAGNUM OPUS",
    bio: "The clan's crowned elder in violet armor and a sweeping cape. Slow to move, devastating when he does.",
    style: "Patient boss. Baits blocks, punishes patterns, saves specials for the kill. Grand, theatrical taunts.",
  },
};

export const PLAYER = {
  name: "YOU",
  title: "The Challenger",
  special: "FIRE FIST",
  color: "#ff4d2e",
} as const;

// The four agents, in roster order (runs shuffle them).
export const GAUNTLET: FighterId[] = ["haiku", "sonnet", "jev", "opus"];

// A fresh random order of the four agents (Fisher–Yates): the gauntlet order,
// and, split in pairs, the showdown semifinals.
export function shuffledAgents(random = Math.random): FighterId[] {
  const order = [...GAUNTLET];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// Every match is a single round (a draw replays it).
export const ROUNDS_TO_WIN = 1;

export const summonerSide = (sides: (FighterId | "player")[]): 0 | 1 | null => {
  const s = sides.indexOf("sonnet");
  return s >= 0 && sides[1 - s] === "opus" ? (s as 0 | 1) : null;
};
