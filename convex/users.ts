import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/core";
import { vGithubProfile } from "@convex-dev/auth/providers/oauth/github";

// No duplicate accounts: sign-ins with the same *verified* email land on the
// same user row.
export async function findOrCreateUser(
  ctx: MutationCtx,
  p: { email?: string; emailVerified: boolean; name?: string; image?: string },
) {
  const email = p.email && p.emailVerified ? p.email.toLowerCase() : undefined;
  if (email) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) return existing._id;
  }
  return await ctx.db.insert("users", { email, name: p.name, image: p.image });
}

export const createUserGithub = internalMutation({
  args: {
    provider: v.object({
      name: v.literal("github"),
      accountId: v.string(),
      profile: vGithubProfile,
    }),
  },
  returns: v.id("users"),
  handler: async (ctx, { provider: { profile: p } }) => {
    const userId = await findOrCreateUser(ctx, {
      email: p.email ?? undefined,
      emailVerified: p.emailVerified,
      name: p.name ?? p.login,
      image: p.avatarUrl ?? undefined,
    });
    // Default a brand-new account's arcade name to the GitHub login (if free);
    // never rename an existing player who just linked GitHub.
    const existing = await ctx.runQuery(components.authUsername.public.getUsername, { userId });
    if (existing === null) {
      await ctx.runMutation(components.authUsername.public.setUsername, { userId, username: p.login });
    }
    return userId;
  },
});

// Players pick their arcade name here (GitHub logins that are taken land here too).
export const claimUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    const name = username.trim();
    if (name.length < 3 || name.length > 16) {
      return { ok: false as const, error: "Name must be 3-16 characters." };
    }
    const result = await ctx.runMutation(
      components.authUsername.public.setUsername,
      { userId, username: name },
    );
    if (!result.success) {
      return {
        ok: false as const,
        error:
          result.userError.error === "USERNAME_TAKEN"
            ? "That name is taken."
            : "Letters, numbers and _ only.",
      };
    }
    const player = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (player) await ctx.db.patch("players", player._id, { username: name });
    return { ok: true as const };
  },
});

// username === null: a player who hasn't picked an arcade name yet.
export const loggedInUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get("users", userId);
    if (user === null) return null;
    const username = await ctx.runQuery(
      components.authUsername.public.getUsername,
      { userId },
    );
    return { id: userId, username, image: user.image ?? null };
  },
});
