import type { FighterId } from "../../convex/game/fighters";

export type StageId = "temple" | "bamboo" | "neon" | "volcano";

export const STAGES: Record<StageId, { name: string }> = {
  temple: { name: "SAKURA TEMPLE" },
  bamboo: { name: "MOONLIT BAMBOO" },
  neon: { name: "NEON ROOFTOP" },
  volcano: { name: "MAGMA THRONE" },
};

// Each opponent fights on home turf; the boss (and the grand final) burn on the volcano.
export function stageFor(sides: (FighterId | "player")[], label = ""): StageId {
  if (label === "GRAND FINAL" || sides.includes("opus")) return "volcano";
  if (sides.includes("jev")) return "neon";
  if (sides.includes("haiku")) return "bamboo";
  return "temple";
}
