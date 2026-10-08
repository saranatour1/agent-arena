// Art of Battle: an original real-time combat system. Pure and deterministic,
// with no rendering, network or UI, so other games (an RPG, say) can reuse it:
// step(world, inputs) advances exactly one 60fps frame.

export const FPS = 60;
export const WORLD_W = 1000;
export const ROUND_SECONDS = 45;
export const MAX_HP = 100;
export const METER_MAX = 100;
export const WALK_SPEED = 4.2; // world units per frame
export const MIN_GAP = 70; // bodies can't overlap closer than this
const EDGE = 60;

export const INTRO_FRAMES = 100;
export const ROUND_END_FRAMES = 130;
export const FINISH_FRAMES = 150;
export const MATCH_END_FRAMES = 150;

export type Attack = "punch" | "kick" | "special";

export const MOVESET = {
  punch: { startup: 5, active: 4, recovery: 9, range: 96, damage: 7, hitstun: 16, push: 18, meter: 12 },
  kick: { startup: 9, active: 5, recovery: 15, range: 126, damage: 11, hitstun: 22, push: 34, meter: 16 },
  special: { startup: 14, active: 1, recovery: 18, damage: 16, chip: 4, hitstun: 26, push: 40, speed: 11 },
} as const;
const BLOCKSTUN = 10;
const BLOCK_PUSH = 10;
const METER_ON_HIT_TAKEN = 6;
const METER_PER_FRAME = 0.05;

export type Act =
  | "idle"
  | "walk"
  | "block"
  | "punch"
  | "kick"
  | "special"
  | "hitstun"
  | "blockstun"
  | "dizzy"
  | "ko"
  | "win";

export type Fighter = {
  x: number;
  hp: number;
  meter: number;
  act: Act;
  t: number; // frames spent in `act`
  stun: number; // length of current hit/block stun
  connected: boolean; // current attack already landed
  walkDir: -1 | 0 | 1; // -1 left, 1 right (absolute)
  flawless: boolean; // took no damage this round
};

export type Projectile = { owner: 0 | 1; x: number; dir: 1 | -1 };

// Plot twist: a low-health summoner (Sonnet vs Opus) calls in mini Haiku
// sub-agents that dash across and strike, once per match.
export const SUMMON_HP = 25;
export const ASSIST = { speed: 8, damage: 7, reach: 60, stagger: 26, spawnGap: 90, spacing: 40 };
export type Assist = { owner: 0 | 1; id: number; x: number; dir: 1 | -1; delay: number; t: number; done: boolean };

export type Phase = "intro" | "fight" | "finish" | "roundEnd" | "matchEnd";

export type World = {
  f: [Fighter, Fighter];
  projectiles: Projectile[];
  assists: Assist[];
  summoner: 0 | 1 | null; // side allowed to summon (Sonnet vs Opus)
  summoned: boolean;
  phase: Phase;
  phaseT: number;
  frame: number; // total frames simulated
  timer: number; // frames left in the round
  round: number;
  roundWins: [number, number];
  roundsToWin: number;
  roundWinner: 0 | 1 | null;
  roundEndReason: "ko" | "time" | "draw" | null;
  winner: 0 | 1 | null;
  flawlessRounds: [number, number];
};

export type Input = {
  dir: -1 | 0 | 1; // absolute: -1 left, 1 right
  block: boolean;
  attack: Attack | null; // pressed this frame
};

export const NO_INPUT: Input = { dir: 0, block: false, attack: null };

export type GameEvent =
  | { type: "hit"; target: 0 | 1; attack: Attack; damage: number; x: number }
  | { type: "block"; target: 0 | 1; attack: Attack; x: number }
  | { type: "launch"; owner: 0 | 1 }
  | { type: "ko"; target: 0 | 1 }
  | { type: "finish"; target: 0 | 1 }
  | { type: "roundStart"; round: number }
  | { type: "summon"; owner: 0 | 1; count: number }
  | { type: "fight" };

const fighter = (x: number): Fighter => ({
  x,
  hp: MAX_HP,
  meter: 0,
  act: "idle",
  t: 0,
  stun: 0,
  connected: false,
  walkDir: 0,
  flawless: true,
});

export function newWorld(roundsToWin = 2, summoner: 0 | 1 | null = null): World {
  return {
    f: [fighter(330), fighter(670)],
    projectiles: [],
    assists: [],
    summoner,
    summoned: false,
    phase: "intro",
    phaseT: 0,
    frame: 0,
    timer: ROUND_SECONDS * FPS,
    round: 1,
    roundWins: [0, 0],
    roundsToWin,
    roundWinner: null,
    roundEndReason: null,
    winner: null,
    flawlessRounds: [0, 0],
  };
}

const SIDES = [0, 1] as const;

export const facing = (w: World, i: 0 | 1): 1 | -1 => (w.f[i].x <= w.f[1 - i].x ? 1 : -1);
export const distance = (w: World) => Math.abs(w.f[0].x - w.f[1].x);

const attackLength = (a: Attack) => MOVESET[a].startup + MOVESET[a].active + MOVESET[a].recovery;
export const isAttacking = (f: Fighter) => f.act === "punch" || f.act === "kick" || f.act === "special";
const canAct = (f: Fighter) => f.act === "idle" || f.act === "walk" || f.act === "block";

function setAct(f: Fighter, act: Act) {
  f.act = act;
  f.t = 0;
  f.connected = false;
}

const isMatchPoint = (w: World, winner: 0 | 1) => w.roundWins[winner] + 1 >= w.roundsToWin;

export const isFinalRound = (w: World) =>
  w.round > 1 && w.roundWins[0] === w.roundsToWin - 1 && w.roundWins[1] === w.roundsToWin - 1;

function damage(
  w: World,
  target: 0 | 1,
  attack: Attack,
  events: GameEvent[],
  opts: { amount?: number; unblockable?: boolean } = {},
) {
  const d = w.f[target];
  const a = w.f[1 - target];
  const blocked = !opts.unblockable && (d.act === "block" || d.act === "blockstun");
  const mv = MOVESET[attack];
  const amount = opts.amount ?? mv.damage;
  const dir = facing(w, (1 - target) as 0 | 1);
  if (d.act === "dizzy") {
    d.hp = 0;
    setAct(d, "ko");
    events.push({ type: "hit", target, attack, damage: 0, x: d.x }, { type: "ko", target });
    return;
  }
  if (blocked) {
    const chip = attack === "special" ? MOVESET.special.chip : 0;
    d.hp = Math.max(1, d.hp - chip); // chip can't kill
    if (chip) d.flawless = false;
    setAct(d, "blockstun");
    d.stun = BLOCKSTUN;
    d.x += dir * BLOCK_PUSH;
    events.push({ type: "block", target, attack, x: d.x });
    return;
  }
  d.hp = Math.max(0, d.hp - amount);
  d.flawless = false;
  d.meter = Math.min(METER_MAX, d.meter + METER_ON_HIT_TAKEN);
  if (attack !== "special") a.meter = Math.min(METER_MAX, a.meter + MOVESET[attack].meter);
  d.x += dir * mv.push;
  events.push({ type: "hit", target, attack, damage: amount, x: d.x });
  if (d.hp <= 0) {
    if (isMatchPoint(w, (1 - target) as 0 | 1)) {
      // Deciding blow: the loser staggers and the winner gets to FINISH IT.
      d.hp = 0;
      setAct(d, "dizzy");
      w.phase = "finish";
      w.phaseT = 0;
      events.push({ type: "finish", target });
    } else {
      setAct(d, "ko");
      events.push({ type: "ko", target });
    }
  } else {
    setAct(d, "hitstun");
    d.stun = mv.hitstun;
  }
}

// A draw (double KO or equal HP at time) replays the round without a winner.
function endRound(w: World, winner: 0 | 1 | null, reason: "ko" | "time" | "draw") {
  w.phase = "roundEnd";
  w.phaseT = 0;
  w.roundWinner = winner;
  w.roundEndReason = reason;
  if (winner !== null) {
    w.roundWins[winner] += 1;
    if (w.f[winner].flawless) w.flawlessRounds[winner] += 1;
  }
  w.projectiles = [];
  for (const as of w.assists) as.done = true;
}

export function step(w: World, inputs: [Input, Input]): GameEvent[] {
  const events: GameEvent[] = [];
  w.frame++;
  w.phaseT++;

  if (w.phase === "intro") {
    if (w.phaseT === 1) events.push({ type: "roundStart", round: w.round });
    for (const f of w.f) f.t++;
    if (w.phaseT >= INTRO_FRAMES) {
      w.phase = "fight";
      w.phaseT = 0;
      events.push({ type: "fight" });
    }
    return events;
  }

  if (w.phase === "roundEnd") {
    for (const f of w.f) f.t++;
    if (w.phaseT === 1 && w.roundWinner !== null && w.roundWins[w.roundWinner] < w.roundsToWin) {
      setAct(w.f[w.roundWinner], "win");
    }
    if (w.phaseT >= ROUND_END_FRAMES) {
      if (w.roundWinner !== null && w.roundWins[w.roundWinner] >= w.roundsToWin) {
        w.winner = w.roundWinner;
        w.phase = "matchEnd";
        w.phaseT = 0;
        setAct(w.f[w.winner], "win");
      } else {
        const keep = { roundWins: w.roundWins, flawless: w.flawlessRounds, round: w.round + 1 };
        Object.assign(w, newWorld(w.roundsToWin, w.summoner), {
          roundWins: keep.roundWins,
          flawlessRounds: keep.flawless,
          round: keep.round,
          frame: w.frame,
          summoned: w.summoned,
        });
      }
    }
    return events;
  }

  if (w.phase === "matchEnd") {
    for (const f of w.f) f.t++;
    return events;
  }

  if (w.phase === "fight") w.timer = Math.max(0, w.timer - 1);

  SIDES.forEach((i) => {
    const f = w.f[i];
    const inp = inputs[i];
    f.t++;
    f.meter = Math.min(METER_MAX, f.meter + METER_PER_FRAME);
    if (f.act === "ko" || f.act === "dizzy" || f.act === "win") return;
    if ((f.act === "hitstun" || f.act === "blockstun") && f.t >= f.stun) setAct(f, "idle");
    if (isAttacking(f) && f.t >= attackLength(f.act as Attack)) setAct(f, "idle");
    if (!canAct(f)) return;

    if (inp.attack && (inp.attack !== "special" || f.meter >= METER_MAX)) {
      if (inp.attack === "special") f.meter = 0;
      setAct(f, inp.attack);
      return;
    }
    if (inp.block) {
      if (f.act !== "block") setAct(f, "block");
      return;
    }
    if (inp.dir !== 0) {
      if (f.act !== "walk") setAct(f, "walk");
      f.walkDir = inp.dir;
      f.x += inp.dir * WALK_SPEED;
      return;
    }
    if (f.act !== "idle") setAct(f, "idle");
  });

  // Keep bodies apart and inside the stage.
  const [a, b] = w.f;
  const gap = Math.abs(a.x - b.x);
  if (gap < MIN_GAP) {
    const push = (MIN_GAP - gap) / 2;
    const s = a.x <= b.x ? 1 : -1;
    a.x -= push * s;
    b.x += push * s;
  }
  for (const f of w.f) f.x = Math.min(WORLD_W - EDGE, Math.max(EDGE, f.x));

  // Melee hits on the first active frame in range. Both sides are checked
  // before any damage applies, so simultaneous attacks trade.
  const hits: [0 | 1, Attack][] = [];
  for (const i of SIDES) {
    const f = w.f[i];
    if (f.act !== "punch" && f.act !== "kick") continue;
    const mv = MOVESET[f.act];
    const active = f.t > mv.startup && f.t <= mv.startup + mv.active;
    if (active && !f.connected && distance(w) <= mv.range) {
      f.connected = true;
      hits.push([(1 - i) as 0 | 1, f.act]);
    }
  }
  for (const [target, attack] of hits) damage(w, target, attack, events);

  // Specials launch a projectile at the end of startup.
  SIDES.forEach((i) => {
    const f = w.f[i];
    if (f.act === "special" && f.t === MOVESET.special.startup) {
      const dir = facing(w, i);
      w.projectiles = w.projectiles.filter((p) => p.owner !== i);
      w.projectiles.push({ owner: i, x: f.x + dir * 50, dir });
      events.push({ type: "launch", owner: i });
    }
  });
  w.projectiles = w.projectiles.filter((p) => {
    p.x += p.dir * MOVESET.special.speed;
    const target = (1 - p.owner) as 0 | 1;
    if (Math.abs(p.x - w.f[target].x) < 40 && w.f[target].act !== "ko") {
      damage(w, target, "special", events);
      return false;
    }
    return p.x > 0 && p.x < WORLD_W;
  });

  // Sub-agent strikes can't be blocked; they vanish if their summoner goes down.
  const sm = w.summoner;
  if (sm !== null && !w.summoned && w.f[sm].hp > 0 && w.f[sm].hp <= SUMMON_HP && w.f[1 - sm].hp > 0) {
    w.summoned = true;
    const count = w.f[1 - sm].hp > 30 ? 3 : 2;
    const dir = facing(w, sm);
    for (let k = 0; k < count; k++) {
      const x = Math.min(WORLD_W - EDGE, Math.max(EDGE, w.f[sm].x - dir * (ASSIST.spawnGap + k * ASSIST.spacing)));
      w.assists.push({ owner: sm, id: k, x, dir, delay: k * ASSIST.stagger, t: 0, done: false });
    }
    events.push({ type: "summon", owner: sm, count });
  }
  for (const as of w.assists) {
    if (as.done) continue;
    const owner = w.f[as.owner];
    if (owner.act === "ko" || owner.act === "dizzy") {
      as.done = true;
      continue;
    }
    as.t++;
    if (as.t < as.delay) continue;
    as.x += as.dir * ASSIST.speed;
    const target = (1 - as.owner) as 0 | 1;
    if (w.f[target].act !== "ko" && Math.abs(as.x - w.f[target].x) <= ASSIST.reach) {
      as.done = true;
      damage(w, target, "punch", events, { amount: ASSIST.damage, unblockable: true });
    }
    if (as.x < 0 || as.x > WORLD_W) as.done = true;
  }

  const koed = SIDES.filter((i) => w.f[i].act === "ko");
  if (w.f[0].hp <= 0 && w.f[1].hp <= 0) {
    // Double KO, including two deciding blows that landed on the same frame.
    for (const f of w.f) if (f.act === "dizzy") setAct(f, "ko");
    endRound(w, null, "draw");
  } else if (koed.length === 1) {
    endRound(w, (1 - koed[0]) as 0 | 1, "ko");
  } else if (w.phase === "finish" && w.phaseT >= FINISH_FRAMES) {
    const dizzy = SIDES.find((i) => w.f[i].act === "dizzy")!;
    setAct(w.f[dizzy], "ko");
    events.push({ type: "ko", target: dizzy });
    endRound(w, (1 - dizzy) as 0 | 1, "ko");
  } else if (w.phase === "fight" && w.timer === 0) {
    const [h0, h1] = [w.f[0].hp, w.f[1].hp];
    if (h0 === h1) endRound(w, null, "draw");
    else endRound(w, h0 > h1 ? 0 : 1, "time");
  }
  return events;
}

export type Recent = "punch" | "kick" | "special" | "block";

const distanceBand = (d: number): "close" | "mid" | "far" =>
  d <= MOVESET.punch.range ? "close" : d <= MOVESET.kick.range + 60 ? "mid" : "far";

// Situation summary sent to the model with each plan request.
export function situation(w: World, side: 0 | 1, recent: [Recent[], Recent[]]) {
  const me = w.f[side];
  const opp = w.f[1 - side];
  const d = distance(w);
  return {
    round: w.round,
    secondsLeft: Math.ceil(w.timer / FPS),
    distance: distanceBand(d),
    myHp: Math.round(me.hp),
    oppHp: Math.round(opp.hp),
    specialReady: me.meter >= METER_MAX,
    oppSpecialReady: opp.meter >= METER_MAX,
    myRecent: recent[side].slice(-6),
    oppRecent: recent[1 - side].slice(-6),
  };
}
export type Situation = ReturnType<typeof situation>;
