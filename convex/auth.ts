import { components, internal } from "./_generated/api";
import { env } from "./_generated/server";
import { setupCore } from "@convex-dev/auth/core/setup";
import { setupGithub } from "@convex-dev/auth/providers/oauth/github";

const core = setupCore({ component: components.auth });
export const { signOut, refreshSession, isAuthenticated } = core;

// GitHub is the only sign-in. OAuth may send users back to local dev or this
// deployment's static site.
export const { startSignInGithub, completeSignInGithub } = setupGithub(core, {
  component: components.oauthGithub,
  allowedRedirectOrigins: ["http://localhost:5173", env.CONVEX_SITE_URL],
}).attachUserCallbacks({ createUser: internal.users.createUserGithub });
