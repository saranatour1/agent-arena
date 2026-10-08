import type { Attack } from "./engine";

// Short-lived visual effects spawned by game events, expiring at frame `until`.
export type Fx =
  | { id: number; kind: "spark"; x: number; h: number; size: number; color: string; blocked: boolean; until: number }
  | { id: number; kind: "dmg"; x: number; amount: number; until: number }
  | { id: number; kind: "callout"; side: number; text: string; color: string; until: number };

// Where a hit lands on the defender (sprite units above the floor).
export const HIT_HEIGHT: Record<Attack, number> = { punch: 136, kick: 122, special: 120 };
