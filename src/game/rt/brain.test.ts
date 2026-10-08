import { describe, expect, test } from "vitest";
import { Brain, MIN_PLAN_INTERVAL_MS, PREFETCH_AT, TAUNT_GAP } from "./brain";
import { INTRO_FRAMES, NO_INPUT, newWorld, step, type World } from "./engine";

const fighting = (): World => {
  const w = newWorld();
  for (let i = 0; i < INTRO_FRAMES; i++) step(w, [NO_INPUT, NO_INPUT]);
  return w;
};

describe("AI brain", () => {
  test("asks for a plan when nearly out of moves, but not more often than the minimum interval", () => {
    const b = new Brain(0);
    expect(b.wantsPlan(0)).toBe(true);
    b.pending = true;
    expect(b.wantsPlan(10_000)).toBe(false);
    b.receive({ moves: ["punch", "kick", "block", "punch", "kick"], fallback: "block" }, 0);
    expect(b.queue.length).toBeGreaterThan(PREFETCH_AT);
    expect(b.wantsPlan(MIN_PLAN_INTERVAL_MS + 1)).toBe(false); // plenty queued
    b.queue = ["punch"];
    expect(b.wantsPlan(MIN_PLAN_INTERVAL_MS - 1)).toBe(false); // too soon
    expect(b.wantsPlan(MIN_PLAN_INTERVAL_MS + 1)).toBe(true);
  });

  test("taunts at most once per TAUNT_GAP", () => {
    const b = new Brain(0);
    const plan = (taunt: string) => ({ moves: [], fallback: "block" as const, taunt });
    b.receive(plan("first"), 100);
    b.receive(plan("too soon"), 100 + TAUNT_GAP - 1);
    expect([b.taunt, b.tauntFrame]).toEqual(["first", 100]);
    b.receive(plan("again"), 100 + TAUNT_GAP);
    expect(b.taunt).toBe("again");
  });

  test("uses the fallback move when the plan runs dry, and keeps acting", () => {
    const w = fighting();
    const b = new Brain(0);
    b.receive({ moves: [], fallback: "retreat" }, 0);
    const inp = b.input(w, 0);
    expect(b.current?.intent).toBe("retreat");
    expect(inp.dir).toBe(-1); // side 0 faces right, so retreating walks left
    expect(b.fallback).toBeNull();
  });

  test("walks into range before throwing a planned punch", () => {
    const w = fighting();
    const b = new Brain(0);
    b.receive({ moves: ["punch"], fallback: "block" }, 0);
    expect(b.input(w, 0)).toMatchObject({ dir: 1, attack: null });
    w.f[1].x = w.f[0].x + 80;
    expect(b.input(w, 0).attack).toBe("punch");
  });

  test("a new round discards the old plan", () => {
    const b = new Brain(0);
    b.receive({ moves: ["kick", "kick", "kick"], fallback: "block" }, 0);
    b.reset();
    expect(b.queue).toEqual([]);
    expect(b.current).toBeNull();
  });
});
