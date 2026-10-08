import { expect, test } from "vitest";
import { stageFor } from "./stages";

test("each opponent fights on home turf; the boss and the grand final burn on the volcano", () => {
  expect(stageFor(["player", "haiku"])).toBe("bamboo");
  expect(stageFor(["player", "sonnet"])).toBe("temple");
  expect(stageFor(["player", "jev"])).toBe("neon");
  expect(stageFor(["player", "opus"])).toBe("volcano");
  expect(stageFor(["haiku", "jev"])).toBe("neon");
  expect(stageFor(["jev", "sonnet"], "GRAND FINAL")).toBe("volcano");
});
