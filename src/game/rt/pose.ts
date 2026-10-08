import type { Combatant } from "../../components/FighterSprite";
import { POSES, WIN_POSES, easeOut, lerpPose, shiftPose, smooth, spinPose, type Pose } from "../poses";
import { MOVESET, ROUND_END_FRAMES, facing, isAttacking, type Fighter, type World } from "./engine";

const breath = (t: number) => (1 - Math.cos((t / 84) * 2 * Math.PI)) / 2;
const breathing = (t: number) => lerpPose(POSES.idle, POSES.idleLow, breath(t));
const arc = (k: number) => 4 * k * (1 - k); // 0 → 1 → 0, a jump's height
const steps = (n: number) => (k: number) => Math.floor(k * n) / n; // robotic snaps

// Skeleton pose for a fighter's current action and frame.
export function poseFor(f: Fighter, walkingForward: boolean, who: Combatant = "player", full = true): Pose {
  const t = f.t;
  switch (f.act) {
    case "idle":
      return breathing(t);
    case "walk": {
      const k = (1 - Math.cos((t / 22) * 2 * Math.PI)) / 2;
      return walkingForward ? lerpPose(POSES.walkA, POSES.walkB, k) : lerpPose(POSES.walkB, POSES.walkA, k);
    }
    case "block":
    case "blockstun":
      return POSES.block;
    case "punch":
    case "kick":
    case "special": {
      const mv = MOVESET[f.act];
      const [wind, strike] =
        f.act === "punch"
          ? [POSES.punchWind, POSES.punch]
          : f.act === "kick"
            ? [POSES.kickChamber, POSES.kick]
            : [POSES.specialCharge, POSES.special];
      if (t <= mv.startup) {
        const k = t / mv.startup;
        return k < 0.6 ? lerpPose(POSES.idle, wind, easeOut(k / 0.6)) : lerpPose(wind, strike, (k - 0.6) / 0.4);
      }
      if (t <= mv.startup + mv.active) return strike;
      const end = mv.startup + mv.active + mv.recovery;
      if (t >= end) return breathing(t - end); // reached only after the round ends (nothing resets the act)
      return lerpPose(strike, POSES.idle, easeOut((t - mv.startup - mv.active) / mv.recovery));
    }
    case "hitstun":
      return t < 4 ? POSES.hit : lerpPose(POSES.hit, POSES.idle, easeOut(Math.min(1, (t - 4) / Math.max(1, f.stun - 4))));
    case "dizzy": {
      const k = (1 + Math.sin(t / 7)) / 2;
      return lerpPose(POSES.dizzy, POSES.hit, k * 0.5);
    }
    case "ko": {
      // Hang in the hit for a beat, drop under gravity, bounce once, stay down.
      if (t < 6) return POSES.hit;
      const k = Math.min(1, (t - 6) / 22);
      const down = lerpPose(POSES.hit, POSES.ko, k * k);
      const b = (t - 28) / 10;
      return b > 0 && b < 1 ? shiftPose(down, 0, -5 * arc(b)) : down;
    }
    case "win":
      return victoryPose(who, t, full);
  }
}

// ---------------------------------------------------------------- victories

type Key = readonly [frame: number, pose: Pose, ease?: (k: number) => number];

// Tween through keyframes, holding the first and last poses outside them.
function track(keys: readonly Key[], t: number): Pose {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [at, pose, ease = smooth] = keys[i];
    if (t < at) {
      const [from, prev] = keys[i - 1];
      return lerpPose(prev, pose, ease((t - from) / (at - from)));
    }
  }
  return keys[keys.length - 1][1];
}

const lastFrame = (keys: readonly Key[]) => keys[keys.length - 1][0];
const wave = (t: number, period: number) => (1 - Math.cos((t / period) * 2 * Math.PI)) / 2;

// Lower the body by dy over planted feet (a breath or a bob).
function sink(p: Pose, dy: number): Pose {
  const out = shiftPose(p, 0, dy);
  return { ...out, kB: [p.kB[0], p.kB[1] + dy / 2], kF: [p.kF[0], p.kF[1] + dy / 2], fB: p.fB, fF: p.fF };
}

// t: frames since the fighter won. Round wins get the short version; the match
// win gets the full routine. Every routine settles into a loop.
const VICTORY: Record<Combatant, (t: number, full: boolean) => Pose> = {
  player(t, full) {
    const W = WIN_POSES.player;
    const intro: Key[] = [[0, POSES.idle], [10, W.crouch, easeOut], [21, W.pump, easeOut], [30, W.high]];
    const end = lastFrame(intro);
    if (t < end) {
      const k = (t - 11) / 18;
      return k > 0 && k < 1 ? shiftPose(track(intro, t), 0, -(full ? 20 : 12) * arc(k)) : track(intro, t);
    }
    if (!full) return lerpPose(W.high, W.low, 0.25 * wave(t - end, 70));
    // "Yes! Yes!": pull the fist down slowly, punch it back up fast.
    return track([[0, W.high], [8, W.high], [22, W.low], [30, W.high, easeOut], [40, W.high]], (t - end) % 40);
  },

  haiku(t, full) {
    const W = WIN_POSES.haiku;
    const [lift, land] = [8, full ? 34 : 30];
    if (t < lift) return track([[0, POSES.idle], [lift, W.crouch, easeOut]], t);
    if (t < land) {
      const k = (t - lift) / (land - lift);
      const body =
        k < 0.25 ? lerpPose(W.crouch, W.tuck, k / 0.25) : k < 0.8 ? W.tuck : lerpPose(W.tuck, W.land, (k - 0.8) / 0.2);
      return shiftPose(spinPose(body, -360 * smooth(k)), 0, -(full ? 46 : 36) * arc(k));
    }
    const settle: Key[] = full
      ? [[land, W.land], [land + 8, W.land], [land + 22, W.bow], [land + 40, W.bow], [land + 50, W.cheer, easeOut]]
      : [[land, W.land], [land + 6, W.land], [land + 16, W.cheer, easeOut]];
    const end = lastFrame(settle);
    if (t < end) return track(settle, t);
    // Bouncy little hops: up, land with a squash, spring back.
    const c = (t - end) % 22;
    if (c < 12) return shiftPose(W.cheer, 0, -(full ? 8 : 5) * arc(c / 12));
    return track([[12, W.cheer], [15, W.cheerLow, easeOut], [22, W.cheer]], c);
  },

  sonnet(t, full) {
    const W = WIN_POSES.sonnet;
    const intro: Key[] = full
      ? [[0, POSES.idle], [14, W.flourish, easeOut], [24, W.flourish], [50, W.bow], [72, W.bow], [92, W.recite]]
      : [[0, POSES.idle], [14, W.flourish, easeOut], [28, W.flourish], [46, W.recite]];
    const end = lastFrame(intro);
    if (t < end) return track(intro, t);
    return lerpPose(W.recite, W.reciteHigh, wave(t - end, 80));
  },

  jev(t, full) {
    const W = WIN_POSES.jev;
    const intro: Key[] = full
      ? [[0, POSES.idle], [12, W.attention, steps(3)], [22, W.attention], [26, W.salute, steps(2)]]
      : [[0, POSES.idle], [8, W.salute, steps(2)]];
    const end = lastFrame(intro);
    if (t < end) return track(intro, t);
    // Hold the salute on a stepped piston bob; the visor flashes each cycle and
    // (match win) the head ticks between bearings.
    const c = (t - end) % 48;
    const p = sink(W.salute, [0, 2, 0, 2][Math.floor(c / 12)]);
    p.glow = 0.45 + 0.55 * Math.max(0, 1 - c / 16);
    if (full) p.H = [p.H[0] + [0, 3, 0, -3][Math.floor(c / 12)], p.H[1]];
    return p;
  },

  opus(t, full) {
    const W = WIN_POSES.opus;
    const intro: Key[] = full
      ? [[0, POSES.idle], [30, W.tall], [42, W.tall], [82, W.raise]]
      : [[0, POSES.idle], [30, W.tall]];
    const end = lastFrame(intro);
    if (t < end) return track(intro, t);
    // Slow, regal breathing; the cape keeps rolling.
    const k = wave(t - end, 96);
    const p = full ? lerpPose(W.raise, W.raiseLow, k) : sink(W.tall, 2 * k);
    return { ...p, billow: (full ? 0.75 : 0.3) + 0.25 * wave(t - end + 24, 96) };
  },
};

export const victoryPose = (who: Combatant, t: number, full: boolean) => VICTORY[who](Math.max(0, t), full);

// Each routine's signature pose, held when motion is reduced.
export const victoryStill = (who: Combatant): Pose =>
  ({
    player: WIN_POSES.player.high,
    haiku: WIN_POSES.haiku.cheer,
    sonnet: WIN_POSES.sonnet.recite,
    jev: WIN_POSES.jev.salute,
    opus: WIN_POSES.opus.raise,
  })[who];

// ---------------------------------------------------------------- arena

const HITSTOP = 8;
const SLOW_UNTIL = 64;
const SLOW = 0.4;

// Frames of post-KO action shown so far: the match-winning blow freezes for a
// beat, then plays out in slow motion while "K.O." lands.
const replayed = (p: number) =>
  p < HITSTOP ? 0 : p < SLOW_UNTIL ? (p - HITSTOP) * SLOW : (SLOW_UNTIL - HITSTOP) * SLOW + p - SLOW_UNTIL;

// What side i looks like this frame, including the beats after a round is
// decided that the engine doesn't model.
export function arenaPose(w: World, i: 0 | 1, who: Combatant): Pose {
  const f = w.f[i];
  const forward = f.walkDir === facing(w, i);
  if (w.phase !== "roundEnd" && w.phase !== "matchEnd") return poseFor(f, forward, who);
  if (f.act === "win") return victoryPose(who, f.t, w.phase === "matchEnd");

  const since = w.phase === "roundEnd" ? w.phaseT : ROUND_END_FRAMES + w.phaseT;
  const decidingKo =
    w.phase === "roundEnd" &&
    w.roundEndReason === "ko" &&
    w.roundWinner !== null &&
    w.roundWins[w.roundWinner] >= w.roundsToWin;
  const shown = decidingKo ? replayed(since) : since;
  if (f.act === "ko" || isAttacking(f)) return poseFor({ ...f, t: f.t - since + shown }, forward, who);

  // Everyone else stops: a time-out loser slumps, the rest catch their breath.
  const winner = w.phase === "roundEnd" ? w.roundWinner : w.winner;
  const from = poseFor({ ...f, t: f.t - since }, forward, who);
  const rest =
    winner !== null && winner !== i ? lerpPose(POSES.dizzy, POSES.hit, 0.2 * wave(f.t, 150)) : breathing(f.t);
  return lerpPose(from, rest, easeOut(Math.min(1, shown / 14)));
}
