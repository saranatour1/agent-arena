import { describe, expect, test } from "vitest";
import { POSES, lerpPose, type Pose } from "./poses";
import { arenaPose, poseFor, victoryPose } from "./rt/pose";
import { MOVESET, newWorld } from "./rt/engine";
import type { Combatant } from "../components/FighterSprite";

const WHO: Combatant[] = ["player", "haiku", "sonnet", "jev", "opus"];
const gap = (a: Pose, b: Pose) =>
  (Object.keys(POSES.idle) as (keyof typeof POSES.idle)[]).reduce(
    (s, k) => s + Math.hypot(a[k][0] - b[k][0], a[k][1] - b[k][1]),
    0,
  );

describe("fighter animation", () => {
  test("lerp blends joints", () => {
    const mid = lerpPose(POSES.idle, POSES.punch, 0.5);
    expect(mid.hF[0]).toBeCloseTo((POSES.idle.hF[0] + POSES.punch.hF[0]) / 2);
  });

  test("punch and kick actually reach forward", () => {
    expect(POSES.punch.hF[0]).toBeGreaterThan(POSES.idle.hF[0] + 20);
    expect(POSES.kick.fF[0]).toBeGreaterThan(POSES.idle.fF[0] + 30);
    expect(POSES.kick.fF[1]).toBeLessThan(POSES.idle.fF[1] - 80); // foot off the ground
  });

  test("attack frames map to windup → strike → recovery", () => {
    const f = newWorld().f[0];
    f.act = "kick";
    f.t = MOVESET.kick.startup + 1; // first active frame
    expect(poseFor(f, true)).toBe(POSES.kick);
    f.act = "punch";
    f.t = MOVESET.punch.startup + 1;
    expect(poseFor(f, true)).toBe(POSES.punch);
    f.act = "ko";
    f.t = 200;
    expect(poseFor(f, true).P[1]).toBeCloseTo(POSES.ko.P[1]);
  });
});

describe("victory celebrations", () => {
  test("animate over time and keep looping after the intro", () => {
    for (const who of WHO) {
      for (const full of [true, false]) {
        const frames = [0, 15, 30, 60].map((t) => victoryPose(who, t, full));
        expect(gap(frames[0], frames[1]) + gap(frames[1], frames[2]), who).toBeGreaterThan(20);
        // Long after the intro it still moves (a loop, not a frozen pose).
        const late = [600, 610, 620, 630, 640].map((t) => victoryPose(who, t, full));
        expect(Math.max(...late.slice(1).map((p) => gap(late[0], p))), who).toBeGreaterThan(1);
      }
    }
  });

  test("every fighter has their own routine, and round wins are shorter", () => {
    for (const t of [20, 60, 120]) {
      const poses = WHO.map((who) => victoryPose(who, t, true));
      for (let a = 0; a < poses.length; a++) {
        for (let b = a + 1; b < poses.length; b++) {
          expect(gap(poses[a], poses[b]), `${WHO[a]} vs ${WHO[b]} at ${t}`).toBeGreaterThan(10);
        }
      }
    }
    for (const who of WHO) {
      const diff = [10, 20, 30, 40, 50, 60, 70, 80, 90].reduce(
        (s, t) => s + gap(victoryPose(who, t, true), victoryPose(who, t, false)),
        0,
      );
      expect(diff, who).toBeGreaterThan(20);
    }
    expect(victoryPose("opus", 100, true).billow).toBeGreaterThan(0.5);
    expect(victoryPose("jev", 40, true).glow).toBeGreaterThan(0);
  });

  test("the match winner celebrates while the loser stays down", () => {
    const w = newWorld(1);
    Object.assign(w, { phase: "matchEnd", phaseT: 90, winner: 0, roundWinner: 0, roundWins: [1, 0], roundEndReason: "ko" });
    Object.assign(w.f[0], { act: "win", t: 90 });
    Object.assign(w.f[1], { act: "ko", t: 220 });
    expect(arenaPose(w, 0, "haiku")).toEqual(victoryPose("haiku", 90, true));
    expect(arenaPose(w, 1, "jev").P[1]).toBeCloseTo(POSES.ko.P[1]);
  });

  test("the match-winning blow freezes for a beat, then plays in slow motion", () => {
    const w = newWorld(1);
    Object.assign(w, { phase: "roundEnd", roundWinner: 0, roundEndReason: "ko" });
    const at = (p: number, deciding: boolean) => {
      Object.assign(w, { phaseT: p, roundWins: [deciding ? 1 : 0, 0] });
      Object.assign(w.f[0], { act: "punch", t: MOVESET.punch.startup + 1 + p }); // landed at p = 0
      Object.assign(w.f[1], { act: "ko", t: p });
      return [arenaPose(w, 0, "player"), arenaPose(w, 1, "sonnet")];
    };
    expect(at(7, true)[0]).toBe(POSES.punch); // hit-stop: the strike holds
    expect(at(7, false)[0]).not.toBe(POSES.punch);
    expect(at(24, true)[1].P[1]).toBeLessThan(at(24, false)[1].P[1] - 20); // the loser falls slower
  });
});
