/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aggregates from "../aggregates.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as game from "../game.js";
import type * as game_fighters from "../game/fighters.js";
import type * as game_intents from "../game/intents.js";
import type * as game_progress from "../game/progress.js";
import type * as gameLoop from "../gameLoop.js";
import type * as http from "../http.js";
import type * as limits from "../limits.js";
import type * as migrations from "../migrations.js";
import type * as pvp from "../pvp.js";
import type * as share from "../share.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aggregates: typeof aggregates;
  ai: typeof ai;
  auth: typeof auth;
  game: typeof game;
  "game/fighters": typeof game_fighters;
  "game/intents": typeof game_intents;
  "game/progress": typeof game_progress;
  gameLoop: typeof gameLoop;
  http: typeof http;
  limits: typeof limits;
  migrations: typeof migrations;
  pvp: typeof pvp;
  share: typeof share;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  auth: import("@convex-dev/auth/core/_generated/component.js").ComponentApi<"auth">;
  authPasswordProvider: import("@convex-dev/auth/providers/password/_generated/component.js").ComponentApi<"authPasswordProvider">;
  authUsername: import("@convex-dev/auth/username/_generated/component.js").ComponentApi<"authUsername">;
  oauthGithub: import("@convex-dev/auth/providers/oauth/_generated/component.js").ComponentApi<"oauthGithub">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  aiBudget: import("@convex-dev/ai-budget/_generated/component.js").ComponentApi<"aiBudget">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  runsByDay: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"runsByDay">;
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
