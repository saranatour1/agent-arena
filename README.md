# Agent Arena

A real-time, retro arcade fighting game where you take on AI agents — Haiku, Sonnet, Jev and Opus — and, once you're knocked out, watch them fight each other for the crown. Powered by [Convex](https://www.convex.dev).

## How it plays

- **Gauntlet:** fight Haiku, Sonnet, Jev and Opus in a random order each run, one round each. Lose once and you're out; beat all four and you're the champion.
- **Showdown:** if you were knocked out, the agents fight a bracket (semis + final). A low-health Sonnet facing Opus summons Haiku sub-agents.
- **Controls:** ← → move · E punch · R kick · C block · F special (when POWER is full), or 1 2 3 4 for punch, kick, block, special. On-screen buttons on touch.
- **Hearts:** each run costs one heart; you hold up to 5 and get one back every 30 minutes.

## Art of Battle

Fights run on **Art of Battle**, this project's own combat system (`src/game/rt/engine.ts`): a pure, deterministic
60fps simulation with movement, punch/kick/block, a power meter and special, rounds, time-outs, draws and assists.
It has no rendering, network or UI code, so it can be reused for other games (e.g. an RPG's battle scenes).

## How the agents fight in real time

Each AI fighter never waits on its model: `ai.planMoves` returns the next 6–10 moves plus a fallback, the client asks for the next plan while 2 moves are
still queued (`src/game/rt/brain.ts`), and if a plan is late the fallback move (then a scripted move) fires.
Faster models adapt faster — think time is shown in the HUD.

## Built on Convex

| Piece | Used for |
| --- | --- |
| Convex Auth v2 (alpha) | GitHub sign-in; one user per verified email (`convex/users.ts`) |
| Workflow | the run: creates each match and waits for its `matchResult` event (`convex/gameLoop.ts`) |
| Agent + AI Gateway | Claude fighters plan via `@convex-dev/agent` on the Convex AI Gateway (`convex/ai.ts`) |
| AI Gateway Decisions | Jev's plans (`typesafe/jev-1.13`), sampled from its move probabilities |
| AI Budget | per-player and global spend caps; per-fighter usage shown in the lobby (`convex/limits.ts`) |
| Rate Limiter | the hearts token bucket |
| Static Hosting | serves the built frontend from the deployment's `.convex.site` |

## Develop

```bash
pnpm install
pnpm dev          # convex dev + vite
pnpm lint         # typecheck + eslint
pnpm test:once    # vitest: engine, workflow run, auth linking, hearts, UI
```

Set these on each deployment (`npx convex env set …`, add `--prod` for production):
`AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`
(GitHub OAuth app callback: `https://<deployment>.convex.site/oauth/github/callback`). The auth signing keys come
from `npx @convex-dev/auth`. Run `npx convex run limits:init` once per deployment for the global AI spend cap.

## Deploy

```bash
npx convex deploy -y
npx @convex-dev/static-hosting upload --prod --build-command "pnpm run build"
```

The AI Gateway requires a paid Convex plan.
