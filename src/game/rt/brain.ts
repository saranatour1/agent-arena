import { FPS, METER_MAX, MOVESET, NO_INPUT, distance, facing, isAttacking, type Input, type World } from "./engine";
import type { FighterId } from "../../../convex/game/fighters";

import type { Intent } from "../../../convex/game/intents";

export { INTENTS, type Intent } from "../../../convex/game/intents";
export type Plan = { moves: Intent[]; fallback: Intent; taunt?: string; thinkMs?: number };

// Ask for the next plan while this many moves are still queued, so the fighter
// never runs dry while the model is thinking.
export const PREFETCH_AT = 2;
// Never ask a model more often than this; fallback moves cover any gap.
export const MIN_PLAN_INTERVAL_MS = 4000;
// Taunt bubbles: at most one per fighter every TAUNT_GAP, each shown for TAUNT_SHOW (frames).
export const TAUNT_GAP = 12 * FPS;
export const TAUNT_SHOW = 2 * FPS;

// Chance to block a visible attack — the gauntlet gets harder.
export const SKILL: Record<FighterId, number> = { haiku: 0.25, sonnet: 0.4, jev: 0.5, opus: 0.55 };

// Deterministic per-frame pseudo-random in [0, 1).
const rand = (frame: number, side: number, salt = 0) => {
  const x = Math.sin(frame * 12.9898 + side * 78.233 + salt * 37.719) * 43758.5453;
  return x - Math.floor(x);
};

// Executes a model's plan move by move. The model decides strategy (a few
// moves at a time); this layer turns each move into frame-by-frame inputs,
// falls back instantly when the plan runs out, and adds skill-based reflexes.
export class Brain {
  queue: Intent[] = [];
  fallback: Intent | null = null;
  current: { intent: Intent; t: number; pressed: boolean } | null = null;
  pending = false;
  lastThinkMs = 0;
  taunt = "";
  tauntFrame = -Infinity;
  readonly skill: number;

  constructor(skill: number) {
    this.skill = skill;
  }

  private lastAskedAt = -Infinity;

  wantsPlan(now: number) {
    if (this.pending || this.queue.length > PREFETCH_AT || now - this.lastAskedAt < MIN_PLAN_INTERVAL_MS) return false;
    this.lastAskedAt = now;
    return true;
  }

  // A new round starts fresh: moves planned for the old one don't carry over.
  reset() {
    this.queue = [];
    this.current = null;
  }

  receive(plan: Plan, frame: number) {
    this.pending = false;
    this.queue.push(...plan.moves);
    this.fallback = plan.fallback;
    this.lastThinkMs = plan.thinkMs ?? 0;
    if (plan.taunt && frame - this.tauntFrame >= TAUNT_GAP) {
      this.taunt = plan.taunt;
      this.tauntFrame = frame;
    }
  }

  private next(w: World, side: 0 | 1): Intent {
    const queued = this.queue.shift();
    if (queued) return queued;
    // The plan ran out before the next one arrived: use the backup move.
    if (this.fallback) {
      const fb = this.fallback;
      this.fallback = null;
      return fb;
    }
    const d = distance(w);
    if (d > MOVESET.kick.range) return "approach";
    const r = rand(w.frame, side, 3);
    return r < 0.4 ? "punch" : r < 0.75 ? "kick" : "block";
  }

  input(w: World, side: 0 | 1): Input {
    const me = w.f[side];
    const opp = w.f[1 - side];
    const toward = facing(w, side);
    const d = distance(w);
    const idle = NO_INPUT;

    if (w.phase !== "fight" && w.phase !== "finish") return idle;

    // Reflexes: block a visible threat (better fighters react more often).
    const meleeThreat =
      (opp.act === "punch" || opp.act === "kick") &&
      opp.t < MOVESET[opp.act].startup &&
      d <= MOVESET[opp.act].range + 12;
    const projectileThreat = w.projectiles.some(
      (p) => p.owner !== side && Math.abs(p.x - me.x) < 240 && Math.sign(me.x - p.x) === p.dir,
    );
    if ((meleeThreat || projectileThreat) && !isAttacking(me)) {
      if (rand(w.frame - opp.t, side, 7) < this.skill) return { dir: 0, block: true, attack: null };
    }
    // FINISH IT: walk in and hit the staggered opponent.
    if (opp.act === "dizzy") {
      return d > MOVESET.punch.range - 8 ? { dir: toward, block: false, attack: null } : { dir: 0, block: false, attack: "punch" };
    }

    if (!this.current) this.current = { intent: this.next(w, side), t: 0, pressed: false };
    const c = this.current;
    c.t++;
    const done = () => {
      this.current = null;
    };

    switch (c.intent) {
      case "approach":
        if (d <= MOVESET.punch.range - 10 || c.t > 45) done();
        return { dir: toward, block: false, attack: null };
      case "retreat":
        if (c.t > 24) done();
        return { dir: (-toward) as 1 | -1, block: false, attack: null };
      case "block":
        if (c.t > 28) done();
        return { dir: 0, block: true, attack: null };
      case "special":
        if (me.meter < METER_MAX) {
          done(); // not charged — skip straight to the next move
          return idle;
        }
        if (c.pressed && me.act !== "special") done();
        c.pressed = c.pressed || me.act === "special";
        return { dir: 0, block: false, attack: "special" };
      case "punch":
      case "kick": {
        const range = MOVESET[c.intent].range - 8;
        if (c.pressed) {
          if (me.act !== c.intent) done();
          return idle;
        }
        if (me.act === c.intent) {
          c.pressed = true;
          return idle;
        }
        if (d > range && c.t < 40) return { dir: toward, block: false, attack: null };
        if (c.t > 60) done();
        return { dir: 0, block: false, attack: c.intent };
      }
    }
  }
}
