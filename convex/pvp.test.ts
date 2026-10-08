/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { FPS, NO_INPUT, newWorld, step, type Input } from "../src/game/rt/engine";
import { OPENING, decode, encode } from "../src/game/rt/lockstep";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function twoPlayers() {
  const t = convexTest(schema, modules);
  const make = async (username: string) => {
    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    await t.run((ctx) => ctx.db.insert("players", { userId, username, bestScore: 0, clears: 0 }));
    return { userId, as: t.withIdentity({ subject: userId }) };
  };
  return { t, a: await make("ALICE"), b: await make("BOB") };
}

// Player 0 walks in punching, player 1 idles: inputs for a whole match.
function scriptedInputs() {
  const w = newWorld(1);
  let a = OPENING;
  let b = OPENING;
  for (let f = 0; w.winner === null && f < 60 * FPS; f++) {
    const p0: Input = { dir: 1, block: false, attack: f % 20 === 0 ? "punch" : null };
    a += encode(p0);
    b += encode(NO_INPUT);
    step(w, [decode(a[f]), decode(b[f])]);
  }
  return { a, b };
}

type Client = ReturnType<ReturnType<typeof convexTest>["withIdentity"]>;

async function push(as: Client, matchId: Id<"pvpMatches">, chars: string) {
  for (let from = OPENING.length; from < chars.length; from += 200) {
    await as.mutation(api.pvp.pushInputs, { matchId, from, chars: chars.slice(from, from + 200) });
  }
}

describe("online PvP", () => {
  test("pairs two searchers, replays their inputs, and moves both ratings", async () => {
    const { t, a, b } = await twoPlayers();
    expect(await a.as.mutation(api.pvp.findMatch, {})).toBeNull(); // Alice waits
    const paired = await b.as.mutation(api.pvp.findMatch, {});
    expect(paired).not.toBeNull();
    const matchId = paired!.matchId;
    expect((await a.as.query(api.pvp.myMatch, {}))?.side).toBe(0);
    expect((await b.as.query(api.pvp.myMatch, {}))?.side).toBe(1);

    const { a: inA, b: inB } = scriptedInputs();
    expect(await a.as.mutation(api.pvp.finish, { matchId })).toBe(false); // nothing played yet
    await push(a.as, matchId, inA);
    await push(b.as, matchId, inB);
    expect(await b.as.mutation(api.pvp.finish, { matchId })).toBe(true);

    const result = await a.as.query(api.pvp.myMatch, {});
    expect(result).toMatchObject({ status: "done", winner: 0, endedBy: "ko", ratingChange: 16 });
    const ratings = await t.run(async (ctx) => (await ctx.db.query("players").collect()).map((p) => [p.username, p.pvpRating]));
    expect(Object.fromEntries(ratings)).toEqual({ ALICE: 1016, BOB: 984 });
  });

  test("inputs are validated, overlaps trimmed, and a silent opponent forfeits", async () => {
    const { a, b } = await twoPlayers();
    await a.as.mutation(api.pvp.findMatch, {});
    const { matchId } = (await b.as.mutation(api.pvp.findMatch, {}))!;
    const from = OPENING.length;

    await expect(a.as.mutation(api.pvp.pushInputs, { matchId, from, chars: "zz" })).rejects.toThrow();
    expect(await a.as.mutation(api.pvp.pushInputs, { matchId, from, chars: "aaa" })).toBe(from + 3);
    expect(await a.as.mutation(api.pvp.pushInputs, { matchId, from: from + 1, chars: "aaaa" })).toBe(from + 5); // retry overlap
    expect(await a.as.mutation(api.pvp.pushInputs, { matchId, from: from + 9, chars: "a" })).toBe(from + 5); // gap: resend

    expect(await a.as.mutation(api.pvp.claimWin, { matchId })).toBe(false); // Bob only just joined
    vi.advanceTimersByTime(9_000);
    expect(await a.as.mutation(api.pvp.claimWin, { matchId })).toBe(true);
    expect(await b.as.query(api.pvp.myMatch, {})).toMatchObject({ status: "done", winner: 0, endedBy: "forfeit" });
  });
});
