import { describe, expect, test } from "vitest";
import {
  FINISH_FRAMES,
  INTRO_FRAMES,
  MATCH_END_FRAMES,
  MOVESET,
  NO_INPUT,
  ROUND_END_FRAMES,
  newWorld,
  step,
  type GameEvent,
  type Input,
  type World,
} from "./engine";

const run = (w: World, frames: number, inputs: (f: number) => [Input, Input] = () => [NO_INPUT, NO_INPUT]) => {
  const events: GameEvent[] = [];
  for (let i = 0; i < frames; i++) events.push(...step(w, inputs(i)));
  return events;
};
const fightNow = (w: World) => run(w, INTRO_FRAMES);
const press = (a: Input["attack"]): Input => ({ dir: 0, block: false, attack: a });
const close = (w: World) => {
  w.f[0].x = 450;
  w.f[1].x = 530;
};

describe("real-time engine", () => {
  test("intro then FIGHT, inputs ignored during intro", () => {
    const w = newWorld();
    const ev = run(w, INTRO_FRAMES, () => [{ dir: 1, block: false, attack: null }, NO_INPUT]);
    expect(ev.some((e) => e.type === "fight")).toBe(true);
    expect(w.f[0].x).toBe(330);
    expect(w.phase).toBe("fight");
  });

  test("walking closes distance; bodies never overlap", () => {
    const w = newWorld();
    fightNow(w);
    run(w, 200, () => [{ dir: 1, block: false, attack: null }, { dir: -1, block: false, attack: null }]);
    expect(Math.abs(w.f[1].x - w.f[0].x)).toBeGreaterThanOrEqual(69.9);
  });

  test("punch in range hits once; out of range whiffs", () => {
    const w = newWorld();
    fightNow(w);
    close(w);
    const ev = run(w, 30, (i) => [i === 0 ? press("punch") : NO_INPUT, NO_INPUT]);
    expect(ev.filter((e) => e.type === "hit")).toHaveLength(1);
    expect(w.f[1].hp).toBe(100 - MOVESET.punch.damage);

    const far = newWorld();
    fightNow(far);
    const ev2 = run(far, 30, (i) => [i === 0 ? press("punch") : NO_INPUT, NO_INPUT]);
    expect(ev2.some((e) => e.type === "hit")).toBe(false);
  });

  test("block stops a kick", () => {
    const w = newWorld();
    fightNow(w);
    close(w);
    const ev = run(w, 40, (i) => [i === 0 ? press("kick") : NO_INPUT, { dir: 0, block: true, attack: null }]);
    expect(ev.some((e) => e.type === "block")).toBe(true);
    expect(w.f[1].hp).toBe(100);
  });

  test("special needs a full meter and fires a projectile", () => {
    const w = newWorld();
    fightNow(w);
    run(w, 5, (i) => [i === 0 ? press("special") : NO_INPUT, NO_INPUT]);
    expect(w.f[0].act).not.toBe("special");
    w.f[0].meter = 100;
    const ev = run(w, 120, (i) => [i === 0 ? press("special") : NO_INPUT, NO_INPUT]);
    expect(ev.some((e) => e.type === "launch")).toBe(true);
    expect(w.f[1].hp).toBe(100 - MOVESET.special.damage);
  });

  test("KO wins the round; round 2 resets HP; the deciding blow triggers FINISH IT", () => {
    const w = newWorld();
    fightNow(w);
    close(w);
    w.f[1].hp = 5;
    run(w, 20, (i) => [i === 0 ? press("punch") : NO_INPUT, NO_INPUT]);
    expect(w.phase).toBe("roundEnd");
    expect(w.roundWins).toEqual([1, 0]);
    expect(w.flawlessRounds[0]).toBe(1);
    run(w, ROUND_END_FRAMES);
    expect(w.round).toBe(2);
    expect(w.f[1].hp).toBe(100);

    fightNow(w);
    close(w);
    w.f[1].hp = 5;
    const ev = run(w, 20, (i) => [i === 0 ? press("punch") : NO_INPUT, NO_INPUT]);
    expect(ev.some((e) => e.type === "finish")).toBe(true);
    expect(w.phase).toBe("finish");
    run(w, FINISH_FRAMES + 2);
    run(w, ROUND_END_FRAMES + 2);
    expect(w.phase).toBe("matchEnd");
    expect(w.winner).toBe(0);
    run(w, MATCH_END_FRAMES);
  });

  test("time out goes to the healthier fighter", () => {
    const w = newWorld(1);
    fightNow(w);
    w.f[0].hp = 40;
    w.timer = 2;
    run(w, 3);
    expect(w.phase).toBe("roundEnd");
    expect(w.roundWinner).toBe(1);
    expect(w.roundEndReason).toBe("time");
  });

  test("plot twist: a low-health summoner calls Haiku sub-agents that strike", () => {
    const w = newWorld(1, 0);
    fightNow(w);
    w.f[0].hp = 20;
    w.f[1].hp = 60;
    const ev = run(w, 200);
    const summon = ev.find((e) => e.type === "summon");
    expect(summon).toMatchObject({ owner: 0, count: 3 });
    expect(w.f[1].hp).toBeLessThan(60);
    // only once per match
    expect(ev.filter((e) => e.type === "summon")).toHaveLength(1);
  });

  test("no summoner, no sub-agents", () => {
    const w = newWorld(1);
    fightNow(w);
    w.f[0].hp = 10;
    expect(run(w, 100).some((e) => e.type === "summon")).toBe(false);
  });

  test("simultaneous attacks trade instead of favoring side 0", () => {
    const w = newWorld();
    fightNow(w);
    close(w);
    run(w, 20, (i) => [i === 0 ? press("punch") : NO_INPUT, i === 0 ? press("punch") : NO_INPUT]);
    expect(w.f[0].hp).toBe(100 - MOVESET.punch.damage);
    expect(w.f[1].hp).toBe(100 - MOVESET.punch.damage);
  });

  test("double KO and equal-HP time-outs are draws that replay the round", () => {
    const w = newWorld(1);
    fightNow(w);
    close(w);
    w.f[0].hp = 3;
    w.f[1].hp = 3;
    run(w, 20, (i) => [i === 0 ? press("punch") : NO_INPUT, i === 0 ? press("punch") : NO_INPUT]);
    expect(w.phase).toBe("roundEnd");
    expect(w.roundEndReason).toBe("draw");
    expect(w.roundWins).toEqual([0, 0]);
    run(w, ROUND_END_FRAMES);
    expect(w.phase).toBe("intro");
    expect(w.round).toBe(2);

    const t = newWorld(1);
    fightNow(t);
    t.timer = 1;
    run(t, 2);
    expect(t.roundEndReason).toBe("draw");
  });

  test("sub-agents summoned at the wall still reach the opponent", () => {
    const w = newWorld(1, 0);
    fightNow(w);
    w.f[0].x = 60;
    w.f[1].x = 600;
    w.f[0].hp = 20;
    run(w, 240);
    expect(w.f[1].hp).toBeLessThan(100);
  });

  test("sub-agent strikes can't be blocked and go through FINISH IT on the deciding blow", () => {
    const w = newWorld(2, 0);
    w.roundWins = [1, 0];
    fightNow(w);
    w.f[0].hp = 20;
    w.f[1].hp = 5;
    const ev = run(w, 240, () => [NO_INPUT, { dir: 0, block: true, attack: null }]);
    expect(ev.some((e) => e.type === "finish")).toBe(true);
  });

  test("sub-agents vanish when their summoner is knocked out", () => {
    const w = newWorld(1, 0);
    fightNow(w);
    w.f[0].hp = 20;
    w.f[1].x = 900;
    run(w, 2);
    expect(w.assists.length).toBeGreaterThan(0);
    w.f[0].hp = 0;
    w.f[0].act = "ko";
    run(w, 1);
    expect(w.assists.every((a) => a.done)).toBe(true);
  });
});
