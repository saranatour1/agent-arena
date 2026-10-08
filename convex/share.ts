import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/core";
import { env, httpAction, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { FIGHTERS } from "./game/fighters";

const MAX_CARD_BYTES = 2_000_000;

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    if ((await getAuthUserId(ctx)) === null) throw new ConvexError("Not signed in");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveCard = mutation({
  args: { runId: v.id("runs"), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, { runId, storageId }) => {
    const userId = await getAuthUserId(ctx);
    const run = await ctx.db.get("runs", runId);
    if (!run || run.userId !== userId) throw new ConvexError("Not your run");
    const meta = await ctx.db.system.get("_storage", storageId);
    if (!meta || meta.size > MAX_CARD_BYTES || meta.contentType !== "image/png") {
      await ctx.storage.delete(storageId);
      throw new ConvexError("Share card must be a PNG under 2 MB");
    }
    if (run.shareImage) await ctx.storage.delete(run.shareImage);
    await ctx.db.patch("runs", runId, { shareImage: storageId });
    return null;
  },
});

export const cardInfo = internalQuery({
  args: { runId: v.string() },
  handler: async (ctx, { runId }) => {
    const id = ctx.db.normalizeId("runs", runId);
    const run = id ? await ctx.db.get("runs", id) : null;
    if (!run) return null;
    const player = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", run.userId))
      .unique();
    return {
      username: player?.username ?? "A challenger",
      beaten: run.beaten,
      score: run.score,
      champion: run.champion ? FIGHTERS[run.champion].name : null,
      image: run.shareImage ? await ctx.storage.getUrl(run.shareImage) : null,
    };
  },
});

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// /api/share/<runId>: social meta for link previews, then a redirect into the game.
export const sharePage = httpAction(async (ctx, req) => {
  const site = env.CONVEX_SITE_URL;
  const runId = new URL(req.url).pathname.split("/").pop() ?? "";
  const info: {
    username: string;
    beaten: number;
    score: number;
    champion: string | null;
    image: string | null;
  } | null = await ctx.runQuery(internal.share.cardInfo, { runId: runId });

  const title = info
    ? info.beaten === 4
      ? `${info.username} cleared the Agent Arena gauntlet!`
      : `${info.username} beat ${info.beaten}/4 AI agents in Agent Arena`
    : "Agent Arena";
  const description = info
    ? `Score ${info.score.toLocaleString()}${info.champion ? ` · ${info.champion} won the agent showdown` : ""}. Can you do better?`
    : "Put 4 AI agents in an arena. Which ones survive?";
  const image = info?.image ?? `${site}/og.png`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(`${site}/api/share/${runId}`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(site)}/">
</head><body><a href="${esc(site)}/">Play Agent Arena</a></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
});
