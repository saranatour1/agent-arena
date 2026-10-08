import { describe, expect, test } from "vitest";
import { FPS, NO_INPUT, newWorld, step, type Attack, type Input } from "./engine";
import { OPENING, decode, encode, isInputs, replay } from "./lockstep";

describe("PvP lockstep", () => {
  test("every input survives the one-character round trip", () => {
    for (const dir of [-1, 0, 1] as const)
      for (const block of [false, true])
        for (const attack of [null, "punch", "kick", "special"] as (Attack | null)[]) {
          const input: Input = { dir, block, attack };
          const c = encode(input);
          expect(isInputs(c)).toBe(true);
          expect(decode(c)).toEqual(input);
        }
    expect(isInputs("abz")).toBe(false);
  });

  test("replaying the recorded inputs reaches the same result as the live fight", () => {
    // Player 0 walks in and punches; player 1 stands still.
    const live = newWorld(1);
    let a = OPENING;
    let b = OPENING;
    for (let f = 0; live.winner === null && f < 60 * FPS; f++) {
      const p0: Input = { dir: 1, block: false, attack: f % 20 === 0 ? "punch" : null };
      a += encode(p0);
      b += encode(NO_INPUT);
      step(live, [decode(a[f]), decode(b[f])]);
    }
    expect(live.winner).toBe(0);
    const { w } = replay(a, b, 1);
    expect(w.winner).toBe(live.winner);
    expect(w.f.map((f) => f.hp)).toEqual(live.f.map((f) => f.hp));
  });
});
