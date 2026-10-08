/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "./schema";
import { rateLimiter } from "./limits";
import { findOrCreateUser } from "./users";

const modules = import.meta.glob("./**/*.ts");

function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}

describe("no duplicate accounts", () => {
  test("same verified email links to the same user", async () => {
    const t = setup();
    const [a, b] = await t.run(async (ctx) => [
      await findOrCreateUser(ctx, { email: "Sara@x.com", emailVerified: true }),
      await findOrCreateUser(ctx, { email: "sara@x.com", emailVerified: true }),
    ]);
    expect(b).toBe(a);
  });

  test("unverified email never links", async () => {
    const t = setup();
    const [a, b] = await t.run(async (ctx) => [
      await findOrCreateUser(ctx, { email: "sara@x.com", emailVerified: true }),
      await findOrCreateUser(ctx, { email: "sara@x.com", emailVerified: false }),
    ]);
    expect(b).not.toBe(a);
  });
});

describe("hearts", () => {
  test("5 hearts, the 6th run is refused", async () => {
    const t = setup();
    const results = await t.run(async (ctx) => {
      const out = [];
      for (let i = 0; i < 6; i++) {
        out.push((await rateLimiter.limit(ctx, "hearts", { key: "u1" })).ok);
      }
      return out;
    });
    expect(results).toEqual([true, true, true, true, true, false]);
  });
});
