# Agent Arena — build loop

Gate per milestone: `pnpm lint && pnpm test:once && npx convex dev --once`

- [x] M1–M8 Convex Auth v2, components, engine, schema, hearts, UI, AI, Workflow, leaderboards, usage
- [x] M10 browser smoke test · M11 prod deploy (https://moonlit-minnow-371.convex.site — not yet updated with the real-time engine)
- [ ] M9 OAuth GitHub/Google — code done; BLOCKED on real client IDs/secrets
- [x] Speed pass: inline workflow steps, no per-turn pauses, low reasoning effort
- [x] Look: skeletal fighters (Claude Clan + Jev + challenger), temple stage, HUD portraits, comic banners
- [x] Real-time engine (Art of Battle, 60fps): `src/game/rt/engine.ts`
  - models plan 5 moves + a fallback (`ai.planMoves`); client prefetches at ≤2 queued (`src/game/rt/brain.ts`)
  - workflow `gameLoop.runGameV3` waits on `matchResult` events from `game.reportMatch`
  - plot twist: low-health Sonnet vs Opus summons 2–3 Haiku sub-agents
